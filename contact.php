<?php
/**
 * Recepción del formulario de presupuesto de flotul.es
 *
 * Devuelve siempre JSON. Escrito para PHP 7.4+ (sin enums, sin readonly,
 * sin tipo never) porque la versión de PHP del plan de Arsys no está fijada.
 *
 * La validación de src/js/modules/form.js se repite aquí a propósito: la del
 * navegador es comodidad para el usuario, esta es la que de verdad protege.
 * Cualquiera puede hacer POST directamente a este archivo.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

// A dónde llegan los avisos de nuevas solicitudes.
const DESTINATARIO = 'boletinesf@gmail.com';

// Remitente. TIENE que ser una dirección del propio dominio: si pones un
// Gmail aquí, Arsys manda un correo que falla SPF y acaba en spam.
const REMITENTE = 'no-reply@flotul.es';

// Antispam.
const MAX_ENVIOS_POR_HORA = 5;   // por IP
const SEGUNDOS_MINIMOS    = 3;   // un humano no rellena esto en menos

// Etiquetas legibles de los servicios. Las claves deben coincidir con los
// value= del <select> de index.html; hacen también de lista blanca.
const SERVICIOS = [
    'boletin'     => 'Boletín eléctrico (CIE)',
    'urgencia'    => 'Urgencia 24h',
    'instalacion' => 'Instalación eléctrica',
    'averia'      => 'Avería / cortocircuito',
    'cuadro'      => 'Cuadro eléctrico',
    'alta'        => 'Alta de luz',
    'otro'        => 'Otro',
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/**
 * Responde en JSON y termina.
 */
function responder(int $estado, array $datos): void
{
    http_response_code($estado);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Elimina saltos de línea. Imprescindible para cualquier valor que acabe
 * en una cabecera de correo: un \r\n permitiría inyectar cabeceras nuevas
 * y convertir este formulario en un relay de spam.
 */
function unaLinea(string $v): string
{
    return trim(str_replace(["\r", "\n", "\0"], ' ', $v));
}

/**
 * Directorio escribible fuera de la raíz web.
 *
 * La cuenta de Arsys tiene data/ y tmp/ como hermanos de html/, así que
 * nada de lo que se guarde ahí es accesible por HTTP. Importante: aquí se
 * escriben datos personales y no pueden quedar expuestos.
 */
function directorioPrivado(string $nombre): ?string
{
    $candidatos = [__DIR__ . '/../' . $nombre, sys_get_temp_dir()];
    foreach ($candidatos as $dir) {
        if (is_dir($dir) && is_writable($dir)) {
            return $dir;
        }
    }
    return null;
}

/**
 * Límite de envíos por IP y hora. Devuelve false si se ha excedido.
 */
function dentroDelLimite(): bool
{
    $dir = directorioPrivado('tmp');
    if ($dir === null) {
        return true; // Sin sitio donde contar, no bloqueamos a nadie.
    }

    $ip    = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
    $ruta  = $dir . '/flotul-rate-' . hash('sha256', $ip) . '.txt';
    $ahora = time();

    $sellos = [];
    if (is_file($ruta)) {
        $bruto  = (string) @file_get_contents($ruta);
        $sellos = array_filter(
            array_map('intval', explode("\n", trim($bruto))),
            function ($t) use ($ahora) {
                return $t > $ahora - 3600;
            }
        );
    }

    if (count($sellos) >= MAX_ENVIOS_POR_HORA) {
        return false;
    }

    $sellos[] = $ahora;
    @file_put_contents($ruta, implode("\n", $sellos), LOCK_EX);
    return true;
}

/**
 * Copia de seguridad de la solicitud en disco, fuera de la raíz web.
 *
 * mail() puede devolver true y aun así perderse el correo por el camino.
 * Esto garantiza que ningún lead desaparece sin dejar rastro.
 */
function registrarSolicitud(array $d, ?string $descartadoPor = null): void
{
    $dir = directorioPrivado('data');
    if ($dir === null) {
        return;
    }
    $linea = json_encode([
        'fecha'      => date('c'),
        'ip'         => $_SERVER['REMOTE_ADDR'] ?? null,
        'descartado' => $descartadoPor,
        'nombre'     => $d['name'] ?? null,
        'telefono'   => $d['phone'] ?? null,
        'email'      => $d['email'] ?? null,
        'servicio'   => $d['service'] ?? null,
        'mensaje'    => mb_substr((string) ($d['message'] ?? ''), 0, 2000),
    ], JSON_UNESCAPED_UNICODE);

    @file_put_contents($dir . '/leads.log', $linea . "\n", FILE_APPEND | LOCK_EX);
}

/**
 * Lo que llegó por POST, en crudo pero acotado. Se usa para dejar rastro de
 * los envíos que descarta el antispam: si algún día un filtro produce un
 * falso positivo, el lead sigue estando en data/leads.log y es recuperable.
 */
function crudo(): array
{
    return [
        'name'    => unaLinea(mb_substr((string) ($_POST['name'] ?? ''), 0, 100)),
        'phone'   => unaLinea(mb_substr((string) ($_POST['phone'] ?? ''), 0, 40)),
        'email'   => unaLinea(mb_substr((string) ($_POST['email'] ?? ''), 0, 200)),
        'service' => unaLinea(mb_substr((string) ($_POST['service'] ?? ''), 0, 40)),
        'message' => (string) ($_POST['message'] ?? ''),
    ];
}

// ---------------------------------------------------------------------------
// 1. Solo POST
// ---------------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responder(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

// ---------------------------------------------------------------------------
// 2. Antispam, antes de gastar trabajo en validar
// ---------------------------------------------------------------------------

// Honeypot: campo oculto por CSS. Un humano no lo ve, los bots lo rellenan.
// Se responde 200 fingiendo éxito para no darles pistas de que se detectó.
// Se registra antes de descartar: algún gestor de contraseñas podría
// autorrellenar un campo llamado "website" y no quiero perder ese lead.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    registrarSolicitud(crudo(), 'honeypot');
    responder(200, ['ok' => true]);
}

// Tiempo mínimo desde que se pintó el formulario.
//
// El reloj del cliente puede ir adelantado, lo que daría un transcurrido
// negativo. Sin la comprobación >= 0, ese caso se descartaría como bot y
// perderíamos una solicitud legítima en silencio.
$abierto = (int) ($_POST['ts'] ?? 0);
if ($abierto > 0) {
    $transcurrido = time() - intdiv($abierto, 1000);
    if ($transcurrido >= 0 && $transcurrido < SEGUNDOS_MINIMOS) {
        registrarSolicitud(crudo(), 'demasiado-rapido');
        responder(200, ['ok' => true]);
    }
}

if (!dentroDelLimite()) {
    registrarSolicitud(crudo(), 'limite-por-hora');
    responder(429, [
        'ok'    => false,
        'error' => 'Has enviado varias solicitudes seguidas. Si es urgente, llámanos al 642 898 520.',
    ]);
}

// ---------------------------------------------------------------------------
// 3. Validación
// ---------------------------------------------------------------------------

$datos = [
    'name'    => unaLinea((string) ($_POST['name'] ?? '')),
    'phone'   => unaLinea((string) ($_POST['phone'] ?? '')),
    'email'   => unaLinea((string) ($_POST['email'] ?? '')),
    'service' => unaLinea((string) ($_POST['service'] ?? '')),
    'message' => trim((string) ($_POST['message'] ?? '')),
];

$errores = [];

if (mb_strlen($datos['name']) < 2 || mb_strlen($datos['name']) > 100) {
    $errores['name'] = 'Indícanos tu nombre (mínimo 2 letras).';
}

$telLimpio = preg_replace('/[\s-]/', '', $datos['phone']);
if (!preg_match('/^(\+?34)?[6-9]\d{8}$/', (string) $telLimpio)) {
    $errores['phone'] = 'Introduce un teléfono español válido (9 dígitos).';
}

// filter_var rechaza de paso cualquier dirección con saltos de línea,
// que es justo lo que se usaría para inyectar cabeceras en el Reply-To.
if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
    $errores['email'] = 'Introduce un email válido.';
}

if (!isset(SERVICIOS[$datos['service']])) {
    $errores['service'] = 'Selecciona el servicio que necesitas.';
}

if (mb_strlen($datos['message']) > 5000) {
    $errores['message'] = 'El mensaje es demasiado largo.';
}

// El consentimiento es un requisito legal (RGPD), no un adorno del formulario.
if (empty($_POST['consent'])) {
    $errores['consent'] = 'Debes aceptar la política de privacidad.';
}

if ($errores) {
    responder(422, ['ok' => false, 'errores' => $errores]);
}

// ---------------------------------------------------------------------------
// 4. Envío
// ---------------------------------------------------------------------------

registrarSolicitud($datos);

$servicio = SERVICIOS[$datos['service']];
$asunto   = sprintf('[flotul.es] %s - %s', $servicio, $datos['name']);

$cuerpo = implode("\n", [
    'Nueva solicitud de presupuesto desde flotul.es',
    str_repeat('-', 46),
    '',
    'Nombre   : ' . $datos['name'],
    'Teléfono : ' . $datos['phone'],
    'Email    : ' . $datos['email'],
    'Servicio : ' . $servicio,
    '',
    'Mensaje:',
    $datos['message'] !== '' ? $datos['message'] : '(no ha escrito nada)',
    '',
    str_repeat('-', 46),
    'Recibido : ' . date('d/m/Y H:i:s'),
    'IP       : ' . ($_SERVER['REMOTE_ADDR'] ?? 'desconocida'),
]);

// From fijo del dominio para no romper SPF; Reply-To con el email validado
// del cliente, de forma que responder al aviso le escriba directamente.
$cabeceras = implode("\r\n", [
    'From: Formulario flotul.es <' . REMITENTE . '>',
    'Reply-To: ' . $datos['email'],
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . PHP_VERSION,
]);

$enviado = @mail(
    DESTINATARIO,
    '=?UTF-8?B?' . base64_encode($asunto) . '?=',
    $cuerpo,
    $cabeceras,
    '-f' . REMITENTE
);

if (!$enviado) {
    // La solicitud ya está en data/leads.log, así que el lead no se pierde,
    // pero el usuario merece saber que no ha llegado por correo.
    responder(500, [
        'ok'    => false,
        'error' => 'No hemos podido enviar tu solicitud. Llámanos al 642 898 520 o escríbenos por WhatsApp.',
    ]);
}

responder(200, ['ok' => true]);
