<?php
require __DIR__ . '/includes/bootstrap.php';

if ($u = usuario_actual()) {
    redirigir(panel_de_rol($u['rol']));
}

$error = null;
$email = '';
if (es_post()) {
    verificar_csrf();
    $email = texto_entrada($_POST, 'email', 150);
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        $error = 'Escribe tu correo y tu contraseña.';
    } else {
        $error = iniciar_sesion($email, $password);
        if ($error === null) {
            $usuario = usuario_actual();
            $volver = $_SESSION['volver_a'] ?? '';
            unset($_SESSION['volver_a']);
            // Solo se regresa a rutas internas del panel que corresponde al rol.
            $panel = BASE_URL . '/' . panel_de_rol($usuario['rol']);
            if (is_string($volver) && str_starts_with($volver, $panel)) {
                header('Location: ' . $volver);
                exit;
            }
            redirigir(panel_de_rol($usuario['rol']));
        }
    }
}

$titulo = 'Iniciar sesión';
$seccion = 'login';
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-xl py-5 mr-login">
    <div class="row justify-content-center w-100 mx-0">
        <div class="col-sm-10 col-md-7 col-lg-5">
            <div class="mr-tarjeta p-4 p-md-5">
                <div class="text-center mb-4">
                    <img src="<?= asset('img/logo.svg') ?>" alt="" width="56" height="56" class="mb-2">
                    <h1 class="h4 mb-1">Iniciar sesión</h1>
                    <p class="text-secondary small mb-0">Accede a tu panel de pasajero, chofer, dueño de línea o administrador.</p>
                </div>
                <?php if ($error): ?>
                    <div class="alert alert-danger py-2" role="alert"><i class="bi bi-exclamation-circle"></i> <?= e($error) ?></div>
                <?php endif; ?>
                <form method="post" novalidate>
                    <?= campo_csrf() ?>
                    <div class="mb-3">
                        <label class="form-label" for="email">Correo electrónico</label>
                        <input class="form-control" type="email" id="email" name="email" value="<?= e($email) ?>" required maxlength="150" autocomplete="username" autofocus>
                    </div>
                    <div class="mb-4">
                        <label class="form-label" for="password">Contraseña</label>
                        <input class="form-control" type="password" id="password" name="password" required maxlength="100" autocomplete="current-password">
                    </div>
                    <button class="btn btn-primary w-100" type="submit"><i class="bi bi-box-arrow-in-right"></i> Entrar</button>
                </form>
                <p class="small text-secondary text-center mt-4 mb-0">¿Solo quieres consultar? No necesitas cuenta: <a href="<?= url() ?>">busca tu ruta</a>.</p>
            </div>
        </div>
    </div>
</section>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
