<?php /** Errores de validación de un formulario. Variable: $errores. */ ?>
<?php if (!empty($errores)): ?>
    <div class="alert alert-danger" role="alert">
        <div class="fw-semibold mb-1"><i class="bi bi-exclamation-circle"></i> Revisa la información:</div>
        <ul class="mb-0 small">
            <?php foreach ($errores as $error): ?><li><?= e($error) ?></li><?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>
