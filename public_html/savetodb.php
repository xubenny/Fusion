<?php
    $input_key = filter_input(INPUT_POST, "key");
    $input_key .= $_SERVER["REMOTE_ADDR"];
    $input_value = filter_input(INPUT_POST, "value");

    define("DBHOST", "198.23.57.27");
    define("DBPORT", "3306");
    define("DBNAME", "binxu2_ei");
    define("DBUSER", "binxu2_ei");
    define("DBPASS", "xubinglin");

    try {
        $pdo = new PDO("mysql:host=".DBHOST."; port=".DBPORT."; dbname=".DBNAME, DBUSER, DBPASS);
        $smt = $pdo->prepare("INSERT INTO fusion_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value=?");

        if(!$smt->execute(array($input_key, $input_value, $input_value)))
            print_r($smt->errorInfo());
    } catch (Exception $ex) {
        echo 'ERROR: '. $ex->getMessage();
    }
?>