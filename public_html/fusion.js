/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 *
 * How to add a difficulty of 6*6:
 * 1. copy the link to css in <head> of index.html
 * 2. copy input&label from 5*5 in <form class="my-panel-form"> of index.html, change everything to 6
 * 3. copy prop("checked", true) in ready() from 5*5, change to 6
 * 4. copy case 6 in resetVariables(), adjust everything involved
 * 5. copy fusion-6x6.css file from 5x5, adjust every css style
 *
 */

var slots;  // store the cube's pointers
var maxRowCol; // dimension of slots, can be changed by difficulty option
var initValue;
var cubeStyle;
var soundSwitch;

var moves;  // store movement used for rewind
var mainPageAction = "none"; // can be "New Game" "Revive" "Resume"
var sounds; // array store sounds objects
var ath;    // add a shortcut to home screen
var bestScore = 0;
var currentScore = 0;
var userName = "[Your Name]";
var soundReady = false;


$(document).ready(function(){
    ///////////// setup all event handle function /////////////
    enableInput();

    // responsible in Windows
    $(window).resize(adjustPosition);

    // change the arrow when menu has been open or close
    $("#menu-panel" ).panel({
        open: function() {$("#menu-handle-img").attr("src", "image/swipe-left.png");}
    });
    $("#menu-panel" ).panel({
        close: function() {$("#menu-handle-img").attr("src", "image/swipe-right.png");}
    }); 
    
    // click menu handle sound switch
    $("#menu-handle").click(function() {
        if (soundSwitch == "on")
            sounds['click'].play();

        // turn off user input while panel is open
        // because we dont want the touch action for menu effect game
        // another hand, game's event handle will block the swipe to close of panel
        // while panel is open, the handle button is disable by JM, so dont worry about the click and close situation
        disableInput(false);
    });
    
    // click difficulty radio button
    $("input[name='radio-difficulty']").change(function() {
        // if user press the radio already checked, it mean he want to new game
        if(maxRowCol == parseInt($(this).val()))
            newGame();
        // if user press the radio not checked, 
        // it mean he want to new game
        else {
            saveProgress(); // save progress to local before leave
            maxRowCol = parseInt($(this).val());
            saveItem("difficulty", maxRowCol); // remember config in local storage

            // start a new game if there is no local storage
            loadGame();
        }
        $("#menu-panel" ).panel("close");
    });

    // click style radio button
    $("input[name='radio-style']").change(function() {
        setCubeStyle($(this).val());
        $("#menu-panel" ).panel("close");
    });

    // click sound radio button
    $("input[name='radio-sound']").change(function() {
        setSoundOnOff($(this).val());
        $("#menu-panel" ).panel("close");
    });

    // click new game or revive game button which in page two after game over
    // or click new game or load game button which in page three after game over
    // the style sheet will be not ready if I invoke newGame() here, (the slots position left and top will be -7)
    // so I just mark here, and handle it in main-page change event
    $(".game-action-btn").click(function(event) {
        mainPageAction = $(this).children().text();

        // triger the sound if browser does not support audio preload
        if(!soundReady && soundIsMute()) {
            for(i=1; i<32768+1; i*=2) {
               sounds['upgrade' + i].play();
               sounds['upgrade' + i].pause();
            }
            sounds['change'].play();
            sounds['change'].pause();
            
            soundReady = true;
        }
        
        // save user name if he click OK in input name page
        if(mainPageAction == "OK") {
            var name = $("#input-name-frame input").val();
            if(name == "")
               event.preventDefault();
            else {
                userName = name;
                saveItem("username", userName);
                prepareTopScore("gameover");
                getTopScores(); // tell my name to server and get latest score list
            }
        }
    });
    
    // click score title can earn one step rewind
    // it's a trick for mobile phone user
    $("#score h2").click(function() {
       reviveGame(true); 
    });
    
    // save progree before browse is closed or session is expired
    // for windows, both beforeunload and unload is work, for iOS, only supprot unload, and pagehide
    // but iOS can not invoke this any event when the page is close by user, only when page refresh or expired
    $(window).on('unload', function() {
        saveProgress();
    });
    
    // new or revive game when page change from game over page to main page
    $("body").pagecontainer({
        change: function(event, ui) {
            if(ui.toPage[0].id != "main-page") {
                // turn off user input while rewinding cubes
                disableInput(true);
                return;
            }

            switch (mainPageAction) {
                case "New Game":
                    newGame();
                    enableInput();
                    break;
                case "Revive":
                    $("#rewind-wrapper").show();
                    // turn off user input while rewinding cubes
                    disableInput(true);

                    reviveGame(false);  // false mean not only one step, but all
                    
                    // turn on user input after rewinding finish
                    setTimeout( function() {
                        $("#rewind-wrapper").hide();
                        enableInput();
                    }, 4000);
                    break;
                case "Resume":
                    loadGame();
                    enableInput();
                    break;
            }
            mainPageAction = "none";
        }
    });
    
    // on panel close, turn on user input again
    $("#menu-panel" ).on( "panelclose", function( event, ui ) {
        enableInput();
    } );
    
    $("#high-score-btn").click(function() {
        saveBestScore();
        getTopScores(); 
        setTimeout( function() {
            prepareTopScore("highscore");
            $("body").pagecontainer("change", "#high-score-page", {changeHash: false});
        }, 500);
    });
    
    ///////////// initial global constant /////////////
    // initial an 2 dimension slots array, just need once during whole session
    slots = [];
     for(var row = 0; row < 6; row++)
         slots[row] = [];
     
    // retrieve the difficulty config from local storage
    if (localStorage.difficulty) {
        maxRowCol = parseInt(localStorage.difficulty);
        switch (maxRowCol) {
            case 4:
                $("#radio-difficulty-4x4").prop("checked", true);
                break;
            case 5:
                $("#radio-difficulty-5x5").prop("checked", true);
                break;
            case 6:
                $("#radio-difficulty-6x6").prop("checked", true);
                break;
        }
        $("input[name='radio-difficulty']").checkboxradio("refresh");
    }
    else
        maxRowCol = parseInt($("input[name='radio-difficulty']:checked").val());

    // initialValue
    if (localStorage.initvalue) {
        initValue = parseInt(localStorage.initvalue);  // here parseInt is necessary, otherwise, a string will be set to initValue, cause unexpect problem
        $("label[for='radio-style-number']").text(initValue);
    }
    else
        initValue = parseInt($("label[for='radio-style-number']").text());
    
    // cubeStyle
    if (localStorage.cubestyle) {
        cubeStyle = localStorage.cubestyle;
        // set to menu
        if (cubeStyle == "number") {
            $("#radio-style-number").prop("checked", true);
        }
        else {
            $("#radio-style-symbol").prop("checked", true);
        }
        $("input[name='radio-style']").checkboxradio("refresh");
    }
    else
        cubeStyle = $("input[name='radio-style']:checked").val();
    
    // sound
    if (localStorage.sound) {
        soundSwitch = localStorage.sound;
        if(soundSwitch == "on")
            $("#radio-sound-on").prop("checked", true);
        else
            $("#radio-sound-off").prop("checked", true);
        $("input[name='radio-sound']").checkboxradio("refresh");
    }
    else
        soundSwitch = $("input[name='radio-sound']:checked").val()
    
    // user name
    if (localStorage.username) {
        userName = localStorage.username;
    }

    // put all sound objects into a array
    sounds = [];
    for (i=1; i<32768+1; i*=2)
        sounds['upgrade' + i] = document.getElementById('upgrade-sound' + i);
    sounds['click'] = document.getElementById('click-sound');
    sounds['change'] = document.getElementById('change-sound');
    
    // can not play background sound in some browse, need further process
    if (soundIsMute())
        $("body").pagecontainer("change", "#newload-game-page");
    // retrieve saved progress from local storage
    else
        loadGame();

    // prepare to ask user ADD a shortcut TO HOME screen
//    addToHomescreen.removeSession();     // use this to remove the localStorage variable
    ath = addToHomescreen({
//        debug: 'ios',           // activate debug mode in ios emulation
//        skipFirstVisit: false,	// show at first access
//        startDelay: 0,          // display the message right away
//        lifespan: 0,            // do not automatically kill the call out
//        displayPace: 0,         // do not obey the display pace
//        privateModeOverride: true,	// show the message in private mode
//        maxDisplayCount: 0,      // do not obey the max display count
        autostart: false            // will show tip in moveCubes()
    });
}); // end ready

function enableInput() {
    $(document).on('touchstart', touchHandler);
    $(document).off('touchmove', preventBounceHandler);
    $(document).on('touchmove', touchHandler);
    $(document).on('keydown', keydownHandler);
}

function disableInput(prevent) {    // prevent mean whether prevent user scroll the screen
    $(document).off('touchstart', touchHandler);
    $(document).off('touchmove', touchHandler);
    $(document).off('keydown', keydownHandler);

    $(document).on('touchmove', prevent, preventBounceHandler);
}

function preventBounceHandler (event) {
    if (event.data == true)
        event.preventDefault();
}

function keydownHandler (key) {
    switch (key.which){
        case 37:
            moveCubes("left");
            break;
        case 38:
            moveCubes("up");
            break;
        case 39:
            moveCubes("right");
            break;
        case 40:
            moveCubes("down");
            break;
        case 27: // escape
            reviveGame(true);   // true mean just rewind one step
            break;
        case 36: // home
            reviveGame(false);   // false mean rewind 10 steps
            break;
    }
}

var touchstart = {"x":-1, "y":-1}; 
var bCauseMove;
function touchHandler(event) {
    var touch;
    touch = event.originalEvent.touches[0];
    switch (event.type) {
        case 'touchstart':
            touchstart.x = touch.pageX;
            touchstart.y = touch.pageY;
            bCauseMove = false;
            break;
        case 'touchmove':
            var distanceX = Math.abs(touch.pageX-touchstart.x);
            var distanceY = Math.abs(touch.pageY-touchstart.y);

            // bCauseMove mean the user's finger movement not cause any movement yet
            if (!bCauseMove && (distanceX > 50 || distanceY > 50)) {
                var direction;
                if(distanceX > distanceY) { // horizonal
                    if (touch.pageX > touchstart.x)
                        direction = "right";
                    else
                        direction = "left";
                }
                else { // vertical
                    if (touch.pageY > touchstart.y)
                        direction = "down";
                    else
                        direction = "up";
                }
                if(direction == "right" && touchstart.x < 25) { // open the panel menu
                    $("#menu-panel" ).panel("open");
                    disableInput(false);
                }
                else {
                    moveCubes(direction);
                    bCauseMove = true;
                }
            }            
            event.preventDefault();
            break;
    }
}

var bMoved; // for deciding whether create new cube depended on whether some cube are moved
var upgradeNumber; // for play a upgrade sound, will be 1,2,4,8..., 1 mean not any upgrade, 2 mean upgrade from 2 to 4
function moveCubes(direction) {
    bMoved = false;
    upgradeNumber = 1; // 1 mean not move yet

    // clear show and merged tag
    for(row=0;row<maxRowCol;row++)
    for(col=0;col<maxRowCol;col++) {
        cube = slots[row][col];
        if(cube !== null)
        {
            if (cube.hasClass("showCube"))
                cube.removeClass("showCube");
            if (cube.hasClass("mergedCube"))
                cube.removeClass("mergedCube");
            
            // reset status for next move
            // is OK even if there will be not a actual move
            cube.data("action", "stay"); // only merge cube need to record twin position, so just ignore them
            cube.data("originRow", row);
            cube.data("originCol", col);
        }
    }
    
    switch (direction)
    {
        case "left":
            for(var col=1; col<maxRowCol; col++)
                for(var row=0; row<maxRowCol; row++)
                    moveCube(row, col, direction);
            break;
        case "right":
            for(var col=maxRowCol-2; col>=0; col--)
                for(var row=0; row<maxRowCol; row++)
                    moveCube(row, col, direction);
            break;
        case "up":
            for(var row=1; row<maxRowCol; row++)
                for(var col=0; col<maxRowCol; col++)
                    moveCube(row, col, direction);
            break;
        case "down":
            for(var row=maxRowCol-2; row>=0; row--)
                for(var col=0; col<maxRowCol; col++)
                    moveCube(row, col, direction);
            break;
    }
    
    if(bMoved) {
        createCube();  // should placed before record snapshot

        // record the snapshot, for play back
        var cubes = [];
        for(row=0; row<maxRowCol; row++) {
            cubes[row] = [];
            for(col=0; col<maxRowCol; col++) {
                cube = slots[row][col];
                
                if (cube == null) {
                    cubes[row][col] = 0;    // can not use 'null', otherwise fail to post to PHP server
                    continue;
                }
                switch (cube.data("action")){
                    case "created":
                        cubes[row][col] = {
                            "a": "c"    // user abbreviation because they need to be saved in local storage and remote database
                        }
                        break;
                    case "moved":
                        cubes[row][col] = {
                            "a": "mv",
                            "r0": cube.data("originRow"),
                            "c0": cube.data("originCol")
                        }
                        break;
                    case "merged":
                        cubes[row][col] = {
                            "a": "mg",
                            "r0": cube.data("originRow"),
                            "c0": cube.data("originCol"),
                            "tr0": cube.data("twinOriginRow"),
                            "tc0": cube.data("twinOriginCol")
                        }
                        break;
                    default:
                        cubes[row][col] = 0;
                        break;
                } // end switch
            } // end for col
        }  // end for row

        // save movements for at most 10 times
        if (moves.length >= 10)
            moves.shift();  // abandon the earliest one
        moves.push({
            "dir": direction,
            "cubes": cubes
        });
        
        // play the sound coresponding to the largest number be upgraded
        if (soundSwitch == "on")
            sounds['upgrade' + upgradeNumber].play();

        if(gameWillOver()) {
            disableInput(true);
            saveBestScore();

            // get the latest top player list from server, using asynchronous mode, 
            // should leave some time before prepareTopScore()
            getTopScores(); 
            if(userName != "[Your Name]") {
                setTimeout( function() {
                    prepareTopScore("gameover");
                    $("body").pagecontainer("change", "#game-over-page", {changeHash: false});
                }, 1000); // should give some time to user before tell him game over
            }
            else {
                setTimeout( function() {
                    prepareTopScore("gameover");
                    $("body").pagecontainer("change", "#input-name-page", {changeHash: false});
                }, 1000);
            }
        }
        // save progress in some mile stone, but not in game over situation
        else if (upgradeNumber >= 64) {
            saveProgress();
            ath.show(); // ask user Add a shorcut To Home screen (ath) once he reach some point
        }
    }
}

var topScores = [];
function getTopScores() {
    $.ajax({
        type: 'POST',
        url:    'getTopScores.php',
        data: {"name": userName, "uid": myuid(), "difficulty": maxRowCol, "score": bestScore},
        success: function(json) {
            topScores = JSON.parse(json);
            // for test
//            $("#test").text(json);
        }
    });
}

function prepareTopScore(page) {
    if (page == "gameover") {
        topPlayers = $("#top-players-in-game-over");
        myRank = $("#my-rank-in-game-over");
    }
    else {
        topPlayers = $("#top-players-in-high-score");
        myRank = $("#my-rank-in-high-score");
    }
    
    $(".game-over-score h2").text(currentScore);
    $(".best-score h2").text(bestScore);
    $(".top-players p span").text(maxRowCol + "x" + maxRowCol);
    
    $(".player-item").remove();
    
    for (i=0; i<topScores.length-1; i++) {
        topPlayers.append("<p class='player-item player-rank'>" + (i+1) + "</p>");
        topPlayers.append("<p class='player-item player-name'>" + topScores[i].name + "</p>");
        topPlayers.append("<p class='player-item player-score'>" + topScores[i].score + "</p>");
    }
    var rank = topScores[topScores.length-1].rank;

    // if user rank top 5, highlight it
    if(rank < topScores.length-1) {    // 0~4
        $(".player-item").eq(rank * 3).addClass("top-player-highlight");
        $(".player-item").eq(rank * 3 + 1).addClass("top-player-highlight");
        $(".player-item").eq(rank * 3 + 1).text(userName);
        $(".player-item").eq(rank * 3 + 2).addClass("top-player-highlight");
    }
    else {
        myRank.append("<p class='player-item player-rank top-player-highlight'>" + (rank+1) + "</p>");
        myRank.append("<p class='player-item player-name top-player-highlight'>" + userName + "</p>");
        myRank.append("<p class='player-item player-score top-player-highlight'>" + bestScore + "</p>");
    }
}

function saveBestScore() {
    if (currentScore > bestScore) {
        bestScore = currentScore;
        saveItem("bestscore" + maxRowCol, bestScore);
    }
}

function moveCube(row, col, direction) {
    var cube = slots[row][col];    

    // empty cube
    if (cube === null)
        return;

    // caculate the new position
    var newRow = row;
    var newCol = col;
    switch (direction) {
        case "left": 
            if(col===0)  // reach border
                return;
            newCol--; 
            break;
        case "right":
            if(col===maxRowCol-1)
                return;
            newCol++; 
            break;
        case "up":
            if(row===0)
                return;
            newRow--; 
            break;
        case "down":
            if(row===maxRowCol-1)
                return;
            newRow++; 
            break;
    }
    
    // move to next empty slot
    if(slots[newRow][newCol]===null)
    {
        slots[newRow][newCol] = cube;
        slots[row][col] = null;
        cube.css({left: $('.slot').eq(newRow * maxRowCol + newCol).position().left,
                  top: $('.slot').eq(newRow * maxRowCol + newCol).position().top});
              
        cube.data("action", "moved"); // record for rewind

        // continue move to same direction, use recursive method
        moveCube(newRow, newCol, direction);
        bMoved = true;
    }
    // do nothing if value not equal
    else if(slots[newRow][newCol].data("value") !== cube.data("value")) {
    }
    // do nothing if next cube is just merged in the same round
    else if(slots[newRow][newCol].hasClass("mergedCube")) {
    }
    // merge with next cube
    else {
        cube.data("action", "merged"); // record for rewind
        cube.data("twinOriginRow", slots[newRow][newCol].data("originRow")); // record the twin's origin position before kill him
        cube.data("twinOriginCol", slots[newRow][newCol].data("originCol"));

        slots[newRow][newCol].remove();
        slots[newRow][newCol] = cube;
        slots[row][col] = null;
        cube.css({left: $('.slot').eq(newRow * maxRowCol + newCol).position().left,
                  top: $('.slot').eq(newRow * maxRowCol + newCol).position().top});
        
        upgrade(cube);
        bMoved = true;
    }
}

function createCube(){
    var cube = null;
    // random a row
    var row = Math.floor(Math.random() * maxRowCol);
    for(var countRow=0; (countRow<maxRowCol) && (cube===null); countRow++)
    {
        // random a col
        var col = Math.floor(Math.random() * maxRowCol);
        for(var countCol=0;(countCol<maxRowCol) && (cube===null); countCol++)
        {
            if (slots[row][col] === null)
            {
                switch (cubeStyle) {
                    case "number":
                        cube = $("<div class='cube'>" + initValue + "</div>");
                        break;
                    case "symbol":
                        var fileName = 'image/' + initValue + '.png';
                        cube = $("<div class='cube'>" + "<img src=" + fileName + ">" + "</div>");
                        break;
                }
                cube.data("value", initValue);
                cube.addClass("number" + initValue);  //set color and background
                var slotleft = $('.slot').eq(row * maxRowCol + col).position().left;
                var slottop = $('.slot').eq(row * maxRowCol + col).position().top;
                cube.css({left: slotleft, top: slottop});  // set position
                
                // record for rewind
                cube.data("action", "created");
                cube.data("originRow", row);
                cube.data("originCol", col);
                
                $("#slots").append(cube);
                slots[row][col] = cube;

                // for animation
                cube.css('display','initial');
                cube.addClass('showCube');
            }
            col++;
            if(col===maxRowCol) col = 0;
        }
        row++;
        if(row===maxRowCol) row = 0;
    }
}

// upgrade the cube by times 2
function upgrade(cube) {
    var value = cube.data("value");

    // if do not remove, high number class will take higher priority than low number
    cube.removeClass("number" + value);  

    // upgrade data
    value *= 2;
    cube.data("value", value);

    // upgrade outlook
    switch (cubeStyle) {
        case "number":
            cube.text(value);
            break;
        case "symbol":
            var fileName = "image/" + value + ".png";
            cube.children().attr("src", fileName);
            break;
    }

    // upgrade style
    cube.addClass("number" + value);
    cube.addClass("mergedCube");

    // refresh score
    currentScore += value/initValue;
    $("#score h1").text(currentScore);

    // tell moveCubes() the largest upgrade number
    if(upgradeNumber < value/initValue)
        upgradeNumber = value/initValue;
}

function gameWillOver() {
    // for test
//    if ($(".cube").length > 3)
//        return true;
    
    if ($(".cube").length < maxRowCol * maxRowCol)
        return false;
    
    // not dead yet if there are two same neighbours
    for (row=0; row<maxRowCol; row++)
    for (col=0; col<maxRowCol-1; col++)
        if(slots[row][col].data("value") == slots[row][col+1].data("value"))
            return false;
    for (col=0; col<maxRowCol; col++)
    for (row=0; row<maxRowCol-1; row++)
        if(slots[row][col].data("value") == slots[row+1][col].data("value"))
            return false;

    return true;
}

function newGame () {
    // reset global variable
    resetVariables();
    
    // start a new game
    createCube();

    if (soundSwitch == "on")
        sounds['change'].play();
}

// load game from cubes which is retrieve from local storage
function loadGame () {
    // restore cubes to corespond position
    var json = localStorage.getItem("cubes" + maxRowCol);
    if (!json) {
        newGame();
        return;
    }
    
    var cubes = JSON.parse(json);
    if (cubes.length == 0) {    // if empty
        newGame();
        return;
    }
    var cube;

    // reset global variable
    resetVariables();

    for(count=0; count<cubes.length; count++) {
        value = cubes[count].v * initValue; // local store is pure value
        row = cubes[count].r;
        col = cubes[count].c;

        // set outlook
        switch (cubeStyle) {
            case "number":
                cube = $("<div class='cube'>" + value + "</div>");
                break;
            case "symbol":
                var fileName = 'image/' + value + '.png';
                cube = $("<div class='cube'>" + "<img src=" + fileName + ">" + "</div>");
                break;
        }
        // set style and data
        cube.addClass("number" + value);  //set color and background
        cube.data("value", value);

        // set position
        var slotleft = $('.slot').eq(row * maxRowCol + col).position().left;
        var slottop = $('.slot').eq(row * maxRowCol + col).position().top;
        cube.css({left: slotleft, top: slottop});
        $("#slots").append(cube);
        slots[row][col] = cube;

        cube.css('display','initial');
        cube.addClass('showCube');
    } // end for
    
    // restore moves
    json = localStorage.getItem("moves" + maxRowCol);
    if(json)
        moves = JSON.parse(json);
    
    // restore score
    if (localStorage.getItem("score" + maxRowCol)) {
        currentScore = parseInt(localStorage.getItem("score" + maxRowCol));
        $("#score h1").text(currentScore);
    }

    if (soundSwitch == "on")
        sounds['change'].play();
}

function resetVariables() {
    // remove all cubes
    $(".cube").remove();

    // remove all slots
    $(".slot").remove();

    // reset slots pointers
    for(row = 0; row < maxRowCol; row++)
    for(col = 0; col < maxRowCol; col++)
        slots[row][col] = null;

    // empty movements record
    moves = [];

    // reset style sheet
    switch (maxRowCol) {
    case 4:
        $("#5x5style").attr('disabled', true);
        $("#6x6style").attr('disabled', true);
        $("#4x4style").attr('disabled', false);
        break;
    case 5:
        $("#4x4style").attr('disabled', true);
        $("#6x6style").attr('disabled', true);
        $("#5x5style").attr('disabled', false);
        break;
    case 6:
        $("#4x4style").attr('disabled', true);
        $("#5x5style").attr('disabled', true);
        $("#6x6style").attr('disabled', false);
        break;
    }

    // best score
    if (localStorage.getItem("bestscore" + maxRowCol)) {
        bestScore = parseInt(localStorage.getItem("bestscore" + maxRowCol));
    }
    else
        bestScore = 0;

    // create slots to contain the cubes
    for (i=0; i< maxRowCol*maxRowCol; i++)
        $("#slots").append("<div class='slot'></div>");
    
    // reset score
    currentScore = 0;
    $("#score h1").text("0");
}

function reviveGame(oneStep) {
    if (moves.length == 0) // check is there any movement records
        return;

    var move = moves.pop();
    switch (move.dir)
    {
        case "left":
            for(var col=maxRowCol-1; col>=0; col--)
                for(var row=0; row<maxRowCol; row++)
                    rewindCube(row, col, move.cubes[row][col]);
            break;
        case "right":
            for(var col=0; col<maxRowCol; col++)
                for(var row=0; row<maxRowCol; row++)
                    rewindCube(row, col, move.cubes[row][col]);
            break;
        case "up":
            for(var row=maxRowCol-1; row>=0; row--)
                for(var col=0; col<maxRowCol; col++)
                    rewindCube(row, col, move.cubes[row][col]);
            break;
        case "down":
            for(var row=0; row<maxRowCol; row++)
                for(var col=0; col<maxRowCol; col++)
                    rewindCube(row, col, move.cubes[row][col]);
            break;
    }

    if(oneStep)
        return;
    
    if (moves.length > 0)
        setTimeout(function (){
            reviveGame();
        }, 400);
}

function rewindCube(row, col, movement) {

    var cube = slots[row][col];

    // empty cube
    if (cube === null)
        return;
    
    
    switch (movement.a) { // judge by ACTION
        case "c":   // created
            cube.remove(); // just remove it if it has just been created
            slots[row][col] = null;
            break;
        case "mv":  // moved
            var newRow = movement.r0;
            var newCol = movement.c0;
            slots[newRow][newCol] = cube;
            slots[row][col] = null;
            cube.css({left: $('.slot').eq(newRow * maxRowCol + newCol).position().left,
                      top: $('.slot').eq(newRow * maxRowCol + newCol).position().top});
            break;
        case "mg":  //merged
            // move the merger to origin position
            var newRow = movement.r0;
            var newCol = movement.c0;
            downgrade(cube);

            // clone the cube which is merged, then move to the twin origin position
            var twinCube = cube.clone();
            twinCube.data("value", cube.data("value"));
            twinCube.appendTo("#slots");
            
            var twinRow = movement.tr0; // twin origin row
            var twinCol = movement.tc0; // twin origin col
            
            // move back merger
            slots[newRow][newCol] = cube;
            cube.css({left: $('.slot').eq(newRow * maxRowCol + newCol).position().left,
                      top: $('.slot').eq(newRow * maxRowCol + newCol).position().top});
            
            // move back twin
            slots[row][col] = null;
            slots[twinRow][twinCol] = twinCube;
            twinCube.css({left: $('.slot').eq(twinRow * maxRowCol + twinCol).position().left,
                      top: $('.slot').eq(twinRow * maxRowCol + twinCol).position().top});
            break;
    }

}

function downgrade(cube) {
    value = cube.data("value");
    cube.removeClass("number" + value);
    
    // downgrade data
    value /= 2;
    cube.data("value", value);

    // downgrade outlook
    switch (cubeStyle) {
        case "number":
            cube.text(value);
            break;
        case "symbol":
            var fileName = "image/" + value + ".png";
            cube.children().attr("src", fileName);
            break;
    }

    // downgrade style
    cube.addClass("number" + value);

    // refresh score
    currentScore -= value*2/initValue;
    $("#score h1").text(currentScore);
}

function setCubeStyle (style) {
    switch (style) {
        case "number":
            // switch from "symbol" to "number"
            if (cubeStyle != "number") {
                $(".cube").each(function() {
                    $(this).html($(this).data("value"));
                });
            }
            // here is a trick, upgrade the number if press it REPEATLY
            else {
                if (initValue < 512) {  // there should be some limit
                    $(".cube").each(function() { // upgrade all cubes
                        value = $(this).data("value");
                        // if do not remove, high number class will take higher priority than low number
                        $(this).removeClass("number" + value);  

                        value *= 2;
                        $(this).data("value", value);
                        $(this).text(value);
                        $(this).addClass("number" + value);
                    });
                    initValue *= 2;
                }
                // recycle to 1
                else {
                    $(".cube").each(function() {
                        value = $(this).data("value");
                        $(this).removeClass("number" + value);

                        value /= initValue;
                        $(this).data("value", value);
                        $(this).text(value);
                        $(this).addClass("number" + value);
                    });
                    initValue = 1;
                }
                // change the menu label
                $("label[for='radio-style-number']").text(initValue);
                saveItem("initvalue", initValue);
            }
            break;
        case "symbol":
            // switch all cubes from number to symbol
            $(".cube").each(function() {
                fileName = 'image/' + $(this).data("value") + '.png';
                $(this).html("<img src=" + fileName + ">");
            });
            break;
    }
    cubeStyle = style;
    saveItem("cubestyle", style); // remember config in local storage

    if (soundSwitch == "on")
        sounds['change'].play();
}

function setSoundOnOff (sound) {
    soundSwitch = sound;
    saveItem("sound", sound); // remember config in local storage

    if (sound == "on")
        sounds['change'].play();
}

// put the cube to the right place when window is resized
function adjustPosition() {
    for(var row = 0; row < maxRowCol; row++)
    for(var col = 0; col < maxRowCol; col++) {
        cube = slots[row][col];
        if(cube != null) {
            // reset the cube position
            cube.css({left: $('.slot').eq(row * maxRowCol + col).position().left,
                        top: $('.slot').eq(row * maxRowCol + col).position().top});
        }
    }
}

function saveProgress() {
    // do not save empty progress
    if(currentScore == 0)
        return;

    var count = 0;
    var cubes = [];
    var cube;

    for(row=0; row < maxRowCol; row++)
    for(col=0; col < maxRowCol; col++) {
        cube = slots[row][col];
        if (cube != null) {
            cubes[count] = {
                "r": row,
                "c": col,
                "v": cube.data("value") / initValue,    // only save the pure data without effect by enviroment
            };
            count++;
        }
    }

    // save to difference entries
    saveItem("score" + maxRowCol, currentScore);
    saveItem("cubes" + maxRowCol, JSON.stringify(cubes));
    saveItem("moves" + maxRowCol, JSON.stringify(moves));
}

function saveItem (key, value) {
    saveToLocal(key, value);
    
    // maybe save data to server, refer branch Optimize commit first step in GitHub
}

var bFailToSaveLocal = false;
function saveToLocal (key, value) {
    // if already tried to save to local but fail, will not try again
    if(bFailToSaveLocal)
        return;
    
    // save to local storage
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        bFailToSaveLocal = true;
        alert("och! i can't save your progress or config on your device,\n\
             maybe you are using private browsing mode, or your device memory is full!");
    }
}

// if safari version is 601.1(that means iOS 9), sound preload is prohibit
// but 600.1.4 still work
function soundIsMute() {
    var str = navigator.appVersion; 
    var n = str.search("Safari/");
    var version = parseInt(str.substr(n+7, 3));
    
    if(version > 600)
        return true;
    return false;
}

// generate a unique id for each device(in a browser), it will be same for one device all the time
var uid = 0;
function myuid() {
    // already generated in this session
    if (uid != 0)
        return uid;
    
    // already generated in last session and storage in local storage
    if (localStorage.getItem("uid")) {
        uid = localStorage.uid;
        return uid;
    }
    
    // generate now
    var navigator_info = window.navigator;
    var screen_info = window.screen;
    uid = navigator_info.mimeTypes.length;
    uid += navigator_info.userAgent.replace(/\D+/g, '');
    uid += navigator_info.plugins.length;
    uid += screen_info.height || '';
    uid += screen_info.width || '';
    uid += screen_info.pixelDepth || '';

    // save to local storage
    if(!bFailToSaveLocal) {
        try {
            localStorage.setItem("uid", uid);
        } catch (e) {
            bFailToSaveLocal = true;
            alert("och! i can't save your progress or config on your device,\n\
                 maybe you are using private browsing mode, or your device memory is full!");
        }
    }
    
    return uid;    
}
