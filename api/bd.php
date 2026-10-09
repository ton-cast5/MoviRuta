<?php
/** GET: todos los datos que puede ver el usuario actual, en la forma que usa assets/js/servicios.js. */
require __DIR__ . '/_base.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    throw new ErrorApi('Método no permitido.', 405);
}
session_write_close();
respuestaConDatos();
