/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 * 
 */
var slots;  // store the cube's pointers
var maxRowCol = 4; // dimension of slots, can be changed by difficulty option
var initValue = 2;
var cubeStyle;
var soundSwitch;


$(document).ready(function(){
    $(document).on('keydown', keydownHandler);
    $(document).on('touchstart', touchHandler);
    $(document).on('touchmove', touchHandler);

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
            document.getElementById('click-sound').play();
        
    });
    
    // click difficulty radio button
    $("input[name='radio-difficulty']").change(function() {
        maxRowCol = parseInt($(this).val());
        $("#menu-panel" ).panel("close");
        newGame();
    });

    // click style radio button
    $("input[name='radio-style']").change(function() {
        setCubeStyle($(this).val());
        $("#menu-panel" ).panel("close");
    });

    // click sound radio button
    $("input[name='radio-sound']").change(function() {
        setSoundOnOff($(this).val());
    });

    // initial an 2 dimension slots array, just need once during whole session
    slots = new Array();
     for(var row = 0; row < 6; row++)
         slots[row] = new Array();
    
    maxRowCol = parseInt($("input[name='radio-difficulty']:checked").val());
    initValue = parseInt($("label[for='radio-style-number']").text());
    cubeStyle = $("input[name='radio-style']:checked").val();
    soundSwitch = $("input[name='radio-sound']:checked").val()

    newGame();
}); // end ready

function setSoundOnOff (sound) {
    soundSwitch = sound;

    if (sound == "on")
        document.getElementById('change-sound').play();
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

    if (soundSwitch == "on")
        document.getElementById('change-sound').play();
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

function newGame () {
    // reset slots pointers
    for(row = 0; row < maxRowCol; row++)
    for(col = 0; col < maxRowCol; col++)
        slots[row][col] = null;

    // remove all cubes
    $(".cube").remove();

    // remove all slots
    $(".slot").remove();

    // reset style sheet
    switch (maxRowCol) {
    case 4:
        $("#5x5style").attr('disabled', true);
        $("#4x4style").attr('disabled', false);
        break;
    case 5:
        $("#4x4style").attr('disabled', true);
        $("#5x5style").attr('disabled', false);
        break;
    }    

    // create slots to contain the cubes
    for (i=0; i< maxRowCol*maxRowCol; i++)
        $("#slots").append("<div class='slot'></div>");

    // reset score
    $("#score").html('<h1>0</h1>');

    // start a new game
    createCube();

    if (soundSwitch == "on")
        document.getElementById('change-sound').play();
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


var bMoved;
var upgradeNumber;
function moveCubes(direction) {
    bMoved = false;
    upgradeNumber = 0;

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
        }
    }
    
    switch (direction)
    {
        case "Left":
            for(var col=1; col<maxRowCol; col++)
                for(var row=0; row<maxRowCol; row++)
                    moveCube(row, col, direction);
            break;
        case "Right":
            for(var col=maxRowCol-2; col>=0; col--)
                for(var row=0; row<maxRowCol; row++)
                    moveCube(row, col, direction);
            break;
        case "Up":
            for(var row=1; row<maxRowCol; row++)
                for(var col=0; col<maxRowCol; col++)
                    moveCube(row, col, direction);
            break;
        case "Down":
            for(var row=maxRowCol-2; row>=0; row--)
                for(var col=0; col<maxRowCol; col++)
                    moveCube(row, col, direction);
            break;
    }
    
    if(bMoved) {
        createCube();
        // play the sound coresponding to the largest number be upgraded
        if (soundSwitch == "on")
            document.getElementById('upgrade-sound' + upgradeNumber).play();
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
        case "Left": 
            if(col===0)  // reach border
                return;
            newCol--; 
            break;
        case "Right":
            if(col===maxRowCol-1)
                return;
            newCol++; 
            break;
        case "Up":
            if(row===0)
                return;
            newRow--; 
            break;
        case "Down":
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
        slots[newRow][newCol].remove();
        slots[newRow][newCol] = cube;
        slots[row][col] = null;
        cube.css({left: $('.slot').eq(newRow * maxRowCol + newCol).position().left,
                  top: $('.slot').eq(newRow * maxRowCol + newCol).position().top});
        
        upgrade(cube);
        bMoved = true;
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
    var score = parseInt($("#score").text());
    score+= value/initValue;
    $("#score").html('<h1>' + score + '</h1>');

    // tell moveCubes() the largest upgrade number
    if(upgradeNumber < value/2/initValue)
        upgradeNumber = value/2/initValue;
}



function keydownHandler (key) {
    switch (key.which){
        case 37:
            moveCubes("Left");
            break;
        case 38:
            moveCubes("Up");
            break;
        case 39:
            moveCubes("Right");
            break;
        case 40:
            moveCubes("Down");
            break;
        case 27: // escape
            reviveGame(true);   // true mean just rewind one step
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
                        direction = "Right";
                    else
                        direction = "Left";
                }
                else { // vertical
                    if (touch.pageY > touchstart.y)
                        direction = "Down";
                    else
                        direction = "Up";
                }
                moveCubes(direction);
                bCauseMove = true;
            }            
            event.preventDefault();
            break;
    }
}
