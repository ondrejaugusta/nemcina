<?php

spl_autoload_register(function ($class) {
    $prefix = 'Ucebnice\\';

    $base_dir = __DIR__ . '/../src/Ucebnice/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative_class = substr($class, $len);

    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});
