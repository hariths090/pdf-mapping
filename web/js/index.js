var result = {};
var highlightedAreas = [];
var isDragging = false;
var startPosition = {};
var endPosition = {};
var canvas, context;
let rect = {};

var pdfData = null;

var lastKey = "";
var jsonData = {};

var pdfInput = document.getElementById('pdfInput');
var jsonInput = document.getElementById('jsonInput');

pdfInput.addEventListener('change', function (event) {
    var file = event.target.files[0];
    loadPDF(file);
});

jsonInput.addEventListener('change', function (event) {
    var file = event.target.files[0];
    loadJson(file);
});

function loadPDF(file) {
    var reader = new FileReader();

    reader.onload = function (event) {
        var typedArray = new Uint8Array(event.target.result);
        displayPDF(typedArray);
        pdfData = typedArray;
    };

    reader.readAsArrayBuffer(file);
}

function displayPDF(data) {
    pdfjsLib.getDocument(data).promise.then(function (pdf) {
        var container = document.getElementById('pdfContainer');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        var dimensions = document.getElementById('dimensions');

        var currentPage = 1;
        var totalPages = pdf.numPages;

        renderPage(currentPage);

        function renderPage(page) {
            pdf.getPage(page).then(function (pageData) {
                var scale = 1.5;
                var viewport = pageData.getViewport({ scale: scale });
                canvas = document.createElement('canvas');
                context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                var renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                container.innerHTML = '';
                container.appendChild(canvas);

                pageData.render(renderContext).promise.then(function () {
                    if (currentPage > 1) {
                        prevButton.disabled = false;
                    } else {
                        prevButton.disabled = true;
                    }

                    if (currentPage < totalPages) {
                        nextButton.disabled = false;
                    } else {
                        nextButton.disabled = true;
                    }

                    highlightedAreas.forEach(function (area) {
                        if (area.page === currentPage) {
                            var rect = area.rect;
                            var canvasRect = canvas.getBoundingClientRect();
                            var scaleX = canvas.width / canvasRect.width;
                            var scaleY = canvas.height / canvasRect.height;

                            var highlightDiv = document.createElement('div');
                            highlightDiv.classList.add('highlight');
                            highlightDiv.style.left = (rect.left / scaleX) + 'px';
                            highlightDiv.style.top = (rect.top / scaleY) + 'px';
                            highlightDiv.style.width = (rect.width / scaleX) + 'px';
                            highlightDiv.style.height = (rect.height / scaleY) + 'px';
                            container.appendChild(highlightDiv);
                        }
                    });

                    dimensions.textContent = `Width: ${canvas.width}px, Height: ${canvas.height}px`;
                });

                canvas.addEventListener('mousedown', handleMouseDown);
                canvas.addEventListener('mouseup', handleMouseUp);
            });
        }

        function goToPreviousPage() {
            if (currentPage > 1) {
                currentPage--;
                renderPage(currentPage);
            }
        }

        function goToNextPage() {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage(currentPage);
            }
        }

        function drawRectangle() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = 'rgba(255, 0, 0, 0.5)';
            context.fillRect(rectangle.startX, rectangle.startY, rectangle.width, rectangle.height);
        }

        function handleMouseDown(event) {
            var canvasRect = event.target.getBoundingClientRect();
            var scaleX = canvas.width / canvasRect.width;
            var scaleY = canvas.height / canvasRect.height;

            rect.startX = event.clientX - canvas.offsetLeft;
            rect.startY = event.clientY - canvas.offsetTop;

            startPosition.x = (event.clientX - canvasRect.left) * scaleX;
            startPosition.y = (event.clientY - canvasRect.top) * scaleY;
            isDragging = true;
        }

        function handleMouseUp(event) {
            if (isDragging) {
                var canvasRect = event.target.getBoundingClientRect();
                var scaleX = canvas.width / canvasRect.width;
                var scaleY = canvas.height / canvasRect.height;

                endPosition.x = (event.clientX - canvasRect.left) * scaleX;
                endPosition.y = (event.clientY - canvasRect.top) * scaleY;

                var highlightRect = calculateHighlightRect(startPosition, endPosition);

                if (highlightRect.width > 0 && highlightRect.height > 0) {
                    var highlightArea = {
                        page: currentPage,
                        rect: highlightRect
                    };

                    highlightedAreas.push(highlightArea);
                }

                startPosition = {};
                endPosition = {};
                isDragging = false;

                renderPage(currentPage);

                tmp = {
                    index: highlightedAreas.length - 1,
                    page: currentPage,
                    left: highlightArea.rect.left / canvas.width,
                    bottom: (canvas.height - (highlightArea.rect.top + highlightArea.rect.height)) / canvas.height,
                    center: (highlightArea.rect.left + highlightArea.rect.width / 2) / canvas.width
                }

                let oldData = [];
                eval("oldData=jsonData." + lastKey);
                if (Array.isArray(oldData)) {
                    oldData.push(tmp);
                    command = "jsonData." + lastKey + "=" + JSON.stringify(oldData);
                    eval(command);
                } else {
                    command = "jsonData." + lastKey + "=" + JSON.stringify([tmp]);
                    eval(command);
                }

                displayJson();
            }

            context.clearRect(0, 0, context.width, context.height);
        }

        function calculateHighlightRect(startPos, endPos) {
            var rect = {};

            rect.left = Math.min(startPos.x, endPos.x);
            rect.top = Math.min(startPos.y, endPos.y);
            rect.width = Math.abs(endPos.x - startPos.x);
            rect.height = Math.abs(endPos.y - startPos.y);

            return rect;
        }

        prevButton.addEventListener('click', goToPreviousPage);
        nextButton.addEventListener('click', goToNextPage);
    });
}

function loadJson(file) {

    if (file) {
        const reader = new FileReader();

        reader.onload = function (event) {
            const fileContent = event.target.result;
            try {
                jsonData = JSON.parse(fileContent);
                displayJson();
            } catch (error) {
                console.error('Error parsing JSON file:', error);
            }
        };

        reader.readAsText(file);
    } else {
        console.log('No file selected.');
    }
}

function displayJson(data = null, keys = "") {
    data = (data==null)?jsonData:data;
    let html = '';
    for (let key in data) {
        let key_location = keys + key;
        html += `<div class="block">`;
        if ((Array.isArray(data[key]) && data[key].length <= 0) || typeof data[key] !== 'object') {
            if (key == "left" || key == "bottom" || key == "center" || key == "index" || key == "page") {
                html += `<div class="key">${key}:<span class="value">${data[key]}</span></div>`;
            }
            else {
                html += `<div class="key">${key}:<button onclick="get_key(this, '${key_location}')" class="value plus">+</button></div>`;
            }
        }
        else {
            if (typeof key === 'number' || !isNaN(key)) {
                html += `<div class="key">${key}:<button onclick=remove_key('${key_location}') class="value">-</button></div>`;
            }
            else if (Array.isArray(data[key]) && data[key].length > 0) {
                html += `<div class="key">${key}:<button onclick="get_key(this, '${key_location}')" class="value plus">+</button></div>`;
            }
            else {
                html += `<div class="key">${key}:</div>`;
            }
            html += `<div class="folder collapsed"></div>`;
            html += `<div class="value hidden">${displayJson(data[key], key_location + ".")}</div>`;
        }

        html += `</div>`;

    }

    const container = document.getElementById('json-container');
    container.innerHTML = html;
    return html;
}

function get_key(element, lastKeys) {
    lastKey = lastKeys;

    let button = document.getElementsByClassName("plus");
    for (b of button){
        b.style.backgroundColor = '';
        b.style.color = '';
    }

    element.style.backgroundColor = "black";
    element.style.color = "white";
}

function remove_key(key) {

    const keyParts = key.split(".");

    let current = jsonData;
    for (let i = 0; i < keyParts.length - 1; i++) {
        const keyPart = keyParts[i];
        current = current[keyPart];
    }

    const arrayKey = keyParts[keyParts.length - 1];
    const index = parseInt(arrayKey);

    rect_index = current[index].index
    page = highlightedAreas[rect_index].page

    current.splice(index, 1);
    highlightedAreas.splice(rect_index, 1);

    displayJson();
    displayPDF(pdfData);
}

function downloadData() {
    var jsonxData = JSON.stringify(jsonData, null, 2);
    var blob = new Blob([jsonxData], { type: 'application/json' });

    var downloadLink = document.createElement('a');
    downloadLink.download = "pdf_position.json";
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.click();
}