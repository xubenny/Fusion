<?php
    $input_name = filter_input(INPUT_POST, "name");
    $input_uid = filter_input(INPUT_POST, "uid");
    $input_difficulty = filter_input(INPUT_POST, "difficulty");
    $input_score = filter_input(INPUT_POST, "score");
    
    $topN = 5;
    $emptyName = "[Your Name]";

    $output = array();

    define("DBHOST", "198.23.57.27");
    define("DBPORT", "3306");
    define("DBNAME", "binxu2_ei");
    define("DBUSER", "binxu2_ei");
    define("DBPASS", "xubinglin");

    try {
        $pdo = new PDO("mysql:host=".DBHOST."; port=".DBPORT."; dbname=".DBNAME, DBUSER, DBPASS);

        // insert new best score to DB
        if ($input_name != $emptyName) {
            $smt = $pdo->prepare("SELECT * FROM fusion_best_scores WHERE player_name = '$input_name' AND uid = '$input_uid' AND difficulty ='$input_difficulty' ");
            if(!$smt->execute())
                print_r($smt->errorInfo());
            
            // if record already exist, update it
            if($smt->fetch()) {
                $smt = $pdo->prepare("UPDATE fusion_best_scores SET best_score = '$input_score' WHERE player_name = '$input_name' AND uid = '$input_uid' AND difficulty = '$input_difficulty' ");
                if(!$smt->execute())
                    print_r($smt->errorInfo());
            }
            // if record not exist, insert new one
            else {
                $smt = $pdo->prepare("INSERT INTO fusion_best_scores (player_name, uid, difficulty, best_score) VALUES ('$input_name', '$input_uid', '$input_difficulty', '$input_score') ");
                if(!$smt->execute())
                    print_r($smt->errorInfo());
            }
        }
        
        // calculate my rank
        $smt = $pdo->prepare("SELECT COUNT(*) FROM fusion_best_scores WHERE difficulty = '$input_difficulty' AND best_score >= '$input_score'");
        if(!$smt->execute())
            print_r($smt->errorInfo());
        $result = $smt->fetch();
        $rank = $result[0]; // this is count
        
        // if the count including user, eliminate it
        if ($input_name != $emptyName)
            $rank--;
            
        // save the top N to $output
	$smt = $pdo->prepare("SELECT * FROM fusion_best_scores WHERE difficulty = '$input_difficulty' ORDER BY best_score DESC LIMIT {$topN}");
        if(!$smt->execute())
            print_r($smt->errorInfo());
        
        while ($result = $smt->fetch()) {
            $output[] = array("name"=>$result["player_name"], "score"=>$result["best_score"]);
        }
        
        // temporary move user record in top N output if he has no name yet
        if ($rank < $topN && $input_name == $emptyName) {
            $user_record[0] = array("name"=>$input_name, "score"=>$input_score);
            array_splice($output, $rank, 0, $user_record);
            if(count($output) > $topN)
                array_pop($output);
        }
    } catch (Exception $ex) {
        echo 'ERROR: '. $ex->getMessage();
    }
    
    $output[] = array("rank"=>$rank);
    print json_encode($output);
?>