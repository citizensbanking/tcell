const term = document.getElementById("terminal")
var width = 80; var height = 24
const beepAudio = new Audio("beep.wav");

var cx = -1; var cy = -1
var cursorClass = "cursor-blinking-block"

var content // {data: row[height], dirty: bool}
// row = {data: element[width], previous: span}
// dirty/[previous being null] indicates if previous (or entire terminal) needs to be recaclulated. 
// dirty is true/null if terminal/previous need to be re-calculated/shown

function initialize() {
    resize(width, height) // intialize content
    show() // then show the screen
}

function resize(w, h) {
    
    width = w
    height = h
    content = {data: new Array(height), dirty: true}
    for (let i = 0; i < height; i++) {
        content.data[i] = {data: new Array(width), previous: null}
    }

    clearScreen()
}

function clearScreen(fg, bg) {
    if (fg) { term.style.color = intToHex(fg) }
    if (bg) { term.style.backgroundColor = intToHex(bg) }

    content.dirty = true
    for (let i = 0; i < height; i++) {
        content.data[i].previous = null // we set the row to be recacluated later
        for (let j = 0; j < width; j++) {
            content.data[i].data[j] = document.createTextNode(" ") // set the entire row to spaces.
        }
    }
}

function drawCell(x, y, mainc, combc, fg, bg, attrs) {
    var combString = String.fromCharCode(mainc)
    combc.forEach(char => {combString += String.fromCharCode(char)});

    var span = document.createElement("span")
    var use = false
    
    if (fg) { span.style.color = intToHex(fg); use = true }
    if (bg) { span.style.backgroundColor = intToHex(bg); use = true }

    if (attrs != 0) {
        use = true
        if ((attrs & 1) != 0) { span.classList.add("bold") }
        if ((attrs & (1<<1)) != 0) { span.classList.add("blink") }
        if ((attrs & (1<<2)) != 0) { span.classList.add("reverse") }
        if ((attrs & (1<<3)) != 0) { span.classList.add("underline") }
        if ((attrs & (1<<4)) != 0) { span.classList.add("dim") }
        if ((attrs & (1<<5)) != 0) { span.classList.add("italic") }
        if ((attrs & (1<<6)) != 0) { span.classList.add("strikethrough") }
    }

    var textnode = document.createTextNode(combString)
    span.appendChild(textnode)

    content.dirty = true // invalidate terminal- new cell
    content.data[y].previous = null // invalidate row- new row
    content.data[y].data[x] = use ? span : textnode
}

function show() {
    if (!content.dirty) {
        return // no new draws; no need to update
    }

    displayCursor()

    term.innerHTML = ""
    content.data.forEach(row => {
        if (row.previous == null) {
            row.previous = document.createElement("span")
            row.data.forEach(c => {
                row.previous.appendChild(c)
            })
            row.previous.appendChild(document.createTextNode("\n"))
        }
        term.appendChild(row.previous)
    })

    content.dirty = false
}

function showCursor(x, y) {
    content.dirty = true

    if (!(cx < 0 || cy < 0)) { // if original position is a valid cursor position
        content.data[cy].previous = null;
        if (content.data[cy].data[cx].classList) {
            content.data[cy].data[cx].classList.remove(cursorClass)
        }
    }

    cx = x
    cy = y
}

function displayCursor() {
    content.dirty = true

    if (!(cx < 0 || cy < 0)) { // if new position is a valid cursor position
        content.data[cy].previous = null;

        if (!content.data[cy].data[cx].classList) {
            var span = document.createElement("span")
            span.appendChild(content.data[cy].data[cx])
            content.data[cy].data[cx] = span
        }

        content.data[cy].data[cx].classList.add(cursorClass)
    }
}

function setCursorStyle(newClass) {
    if (newClass == cursorClass) {
        return
    }

    if (!(cx < 0 || cy < 0)) {
        // mark cursor row as dirty; new class has been applied to (cx, cy)
        content.dirty = true
        content.data[cy].previous = null

        if (content.data[cy].data[cx].classList) {
            content.data[cy].data[cx].classList.remove(cursorClass)
        }

        // adding the new class will be dealt with when displayCursor() is called
    }

    cursorClass = newClass
}

function beep() {
    beepAudio.currentTime = 0;
    beepAudio.play();
}

function intToHex(n) {
    return "#" + n.toString(16).padStart(6, '0')
}

initialize()

let fontwidth = term.clientWidth / width
let fontheight = term.clientHeight / height

document.addEventListener("keydown", e => {
    onKeyEvent(e.key, e.shiftKey, e.altKey, e.ctrlKey, e.metaKey)
})

term.addEventListener("click", e => {
    onMouseClick(Math.min((e.offsetX / fontwidth) | 0, width-1), Math.min((e.offsetY / fontheight) | 0, height-1), e.which, e.shiftKey, e.altKey, e.ctrlKey)
})

term.addEventListener("mousemove", e => {
    onMouseMove(Math.min((e.offsetX / fontwidth) | 0, width-1), Math.min((e.offsetY / fontheight) | 0, height-1), e.which, e.shiftKey, e.altKey, e.ctrlKey)
})

document.addEventListener("paste", e => {
    e.preventDefault();
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
    onPaste(true)
    for (let i = 0; i < text.length; i++) {
        onKeyEvent(text.charAt(i), false, false, false, false)
    }
    onPaste(false)
});

const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
});