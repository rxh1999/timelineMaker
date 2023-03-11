// initialize empty data array
const data = JSON.parse(localStorage.getItem('data') || '[]', (key, value) => {
    if (key === 'time') {
        return new Date(value);
    }
    return value;
});

// choose color by time
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
const randomColor = (t) => colorScale(t.time.getSeconds() || "");


// create timeline chart
const initialWidth = 640;
const initialHeight = 640;
var chart = new d3KitTimeline('#chart-container', {
    // lable at which direction
    direction: 'right',
    initialWidth: initialWidth,
    initialHeight: initialHeight,
    scale: d3.scaleTime(),
    // node text
    textFn: function (t) {
        return t.time.toLocaleTimeString() + ' -> ' + t.name;
    },
    // axis lable
    timeFn: function (t) {
        return t.time;
    },
    // color
    dotColor: randomColor,
    labelBgColor: randomColor,
    linkColor: randomColor,
    // axis
    formatAxis: axis => {
        // axis label
        axis.tickFormat(t => {
            return (t.getHours().toString().padStart(2, '0') + ":" + t.getMinutes().toString().padStart(2, '0'))
        })
    },
});
// remember initial width and height
chart.initialWidth = initialWidth;
chart.initialHeight = initialHeight;

// add expandOrShrinkToInitial function to chart
chart.expandOrShrinkToInitial = function () {
    const options = this.options();
    let maxVal;
    const nodes = this.force.nodes();
    const max = d3.max;
    let width, height;

    switch (options.direction) {
        case 'up':
            maxVal = max(nodes, d => Math.abs(d.y)) || 0;
            height = maxVal + options.margin.top + options.margin.bottom
            this.height(Math.max(height, this.initialHeight));

            maxVal = max(nodes, d => Math.abs(d.x + d.dx)) || 0;
            width = maxVal + options.margin.left + options.margin.right;
            this.width(Math.max(width, this.initialWidth));
            break;
        case 'down':
            maxVal = max(nodes, d => Math.abs(d.y + d.dy)) || 0;
            height = maxVal + options.margin.top + options.margin.bottom
            this.height(Math.max(height, this.initialHeight));

            maxVal = max(nodes, d => Math.abs(d.x + d.dx)) || 0;
            width = maxVal + options.margin.left + options.margin.right;
            this.width(Math.max(width, this.initialWidth));
            break;
        case 'left':
            maxVal = max(nodes, d => Math.abs(d.x)) || 0;
            width = maxVal + options.margin.left + options.margin.right;
            this.width(Math.max(width, this.initialWidth));

            maxVal = max(nodes, d => Math.abs(d.y + d.dy)) || 0;
            height = maxVal + options.margin.top + options.margin.bottom
            this.height(Math.max(height, this.initialHeight));
            break;
        case 'right':
            maxVal = max(nodes, d => Math.abs(d.x + d.dx)) || 0;
            width = maxVal + options.margin.left + options.margin.right;
            this.width(Math.max(width, this.initialWidth));

            maxVal = max(nodes, d => Math.abs(d.y + d.dy)) || 0;
            height = maxVal + options.margin.top + options.margin.bottom
            this.height(Math.max(height, this.initialHeight));
            break;
    }

    return this;
}


// implement Record
const dataInput = d3.select('#data-input');
d3.select('#add-data-button').on('click', () => {
    // get current time and data from input
    const time = new Date();
    const name = dataInput.property('value');
    // append data to list
    data.push({ time, name });
    localStorage.setItem('data', JSON.stringify(data, (key, value) => {
        if (key === 'time') {
            return value.toLocaleString();
        }
        return value;
    }));
    // clear input
    dataInput.property('value', '');
    // render chart with updated data
    renderChart();
});

// implement Clear
d3.select('#clear-btn').on('click', () => {
    data.length = 0;
    localStorage.removeItem('data');
    renderChart();
});

// implement Download
const chartContainer = d3.select('#chart-container');
d3.select('#download-btn').on('click', () => {
    const svgString = getSVGString(chartContainer.node());
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'timeline.svg';
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});


// render chart
function renderChart() {
    chart.data(data).updateDimensionNow().expandOrShrinkToInitial();
}

// Below are the functions that handle actual exporting:
// getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
function getSVGString(svgNode) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    var cssStyleText = getCSSStyles(svgNode);
    appendCSS(cssStyleText, svgNode);

    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svgNode);
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

    console.log(svgString);

    return svgString;

    function getCSSStyles(parentElement) {
        var selectorTextArr = [];

        // Add Parent element Id and Classes to the list
        selectorTextArr.push('#' + parentElement.id);
        for (var c = 0; c < parentElement.classList.length; c++)
            if (!contains('.' + parentElement.classList[c], selectorTextArr))
                selectorTextArr.push('.' + parentElement.classList[c]);

        // Add Children element Ids and Classes to the list
        var nodes = parentElement.getElementsByTagName("*");
        for (var i = 0; i < nodes.length; i++) {
            var id = nodes[i].id;
            if (!contains('#' + id, selectorTextArr))
                selectorTextArr.push('#' + id);

            var classes = nodes[i].classList;
            for (var c = 0; c < classes.length; c++)
                if (!contains('.' + classes[c], selectorTextArr))
                    selectorTextArr.push('.' + classes[c]);
        }

        // Extract CSS Rules
        var extractedCSSText = "";
        for (var i = 0; i < document.styleSheets.length; i++) {
            var s = document.styleSheets[i];

            try {
                if (!s.cssRules) continue;
            } catch (e) {
                if (e.name !== 'SecurityError') throw e; // for Firefox
                continue;
            }

            var cssRules = s.cssRules;
            for (var r = 0; r < cssRules.length; r++) {
                if (contains(cssRules[r].selectorText, selectorTextArr))
                    extractedCSSText += cssRules[r].cssText;
            }
        }


        return extractedCSSText;

        function contains(str, arr) {
            return arr.indexOf(str) === -1 ? false : true;
        }

    }

    function appendCSS(cssText, element) {
        var styleElement = document.createElement("style");
        styleElement.setAttribute("type", "text/css");
        styleElement.innerHTML = cssText;
        var refNode = element.hasChildNodes() ? element.children[0] : null;
        element.insertBefore(styleElement, refNode);
    }
}



// initial render of chart with empty data
renderChart();
