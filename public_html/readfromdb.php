<?php
    $input_uid = filter_input(INPUT_POST, "uid");

    define("DBHOST", "198.23.57.27");
    define("DBPORT", "3306");
    define("DBNAME", "binxu2_ei");
    define("DBUSER", "binxu2_ei");
    define("DBPASS", "xubinglin");

    $data_keys = array("difficulty", "cubeStyle", "initValue", "sound", "cubes4", "cubes5", "cubes6", "moves4", "moves5", "moves6", "score4", "score5", "score6");
    $output = array();

    try {
        $pdo = new PDO("mysql:host=".DBHOST."; port=".DBPORT."; dbname=".DBNAME, DBUSER, DBPASS);

        foreach ($data_keys as $data_key) {
            $data_uidkey = $data_key . $input_uid;
            $smt = $pdo->prepare("SELECT * FROM fusion_data WHERE data_key = '$data_uidkey'");
            if(!$smt->execute())
                print_r($smt->errorInfo());
            $result = $smt->fetch();
            if(!$result)
                $output[$data_key] = 0;
            else
                $output[$data_key] = $result["data_value"];
        }
    } catch (Exception $ex) {
        echo 'ERROR: '. $ex->getMessage();
    }

    $output_json = json_encode($output);
    print $output_json;
?>