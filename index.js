d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function () {
  return this.each(function () {
    var firstChild = this.parentNode.firstChild;
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild);
    }
  });
};

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

function convertLocalTimeToSettings(h) {
  var year = Math.floor(h);
  var month = Math.floor((h - year) * 12) + 1;
  return year * 100 + month;
}

var width = document.getElementById("body").clientWidth;
var height = document.getElementById("body").clientHeight;

var svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

var watchListWidth = 200,
  watchListHeight = 350;
var watchListGroup = svg.append("g")
  .attr("transform", "translate(" + (width - watchListWidth) + ",100)")
  .attr("width", watchListWidth)
  .attr("height", watchListHeight);
watchListGroup.append("rect")
  .attr("fill", "#fff")
  .attr("opacity", 0.6)
  .attr("width", watchListWidth)
  .attr("height", watchListHeight);

var expGroup = $("#exp");
expGroup.css("background-color", "rgba(255,255,255,0.6)");
expGroup.css("opacity", 0);
$("#search").css("background-color", "rgba(255,255,255,0.6)");
$("#search-button").on("click", function () {
  var val = $("#search-select").val();
  if (watchList.indexOf(val) == -1)
    watchList.push(val);
  updateWatchList();
  return false;
});

var color = d3.scaleOrdinal(d3.schemeCategory10);
var radius = 5;

var simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(function (d) {
    return d.id;
  }))
  .force("charge", d3.forceManyBody().distanceMax(200))
  .force("center", d3.forceCenter(width / 2, height / 2));

var link_group = svg.append("g")
  .attr("class", "links");
var node_group = svg.append("g")
  .attr("class", "nodes");
var node_data, graph_data;
var settings_time = 201701;
var brushMode = false;
var brushSelection = [2016, 2017];
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function (d) {
    return "<strong>姓名: </strong>" + d["姓名"] + "<br>" +
      "<strong>担任职务: </strong>" + d["担任职务"] + "<br>";
  });

d3.csv("data1.csv").then(function (data) {
  node_data = data;
  node_group.call(tip);

  for (var i = 0; i < data.length; ++i) {
    $("#search-select").append($('<option>', {
      value: data[i].id,
      text: data[i]["姓名"]
    }));
  }

  var node = node_group
    .selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("r", radius)
    .attr("fill", "#000")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended))
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)
    .on("click", function (d) {
      var index = watchList.indexOf(d.id);
      if (index > -1)
        watchList.splice(index, 1);
      else
        watchList.push(d.id);
      updateWatchList();
    })
    .style("cursor", "pointer");

  d3.csv("link.csv").then(buildGraph);
});

function processLink(data) {
  var ret = {};
  for (var i = 0; i < data.length; ++i) {
    if (!ret.hasOwnProperty(data[i].time))
      ret[data[i].time] = [];
    ret[data[i].time].push(data[i]);
  }
  return ret;
}

function reset() {
  var localD = [];
  if (brushMode) {
    var colorScale = d3.scaleSequential(d3.interpolateYlOrRd);
    var func = {};
    var maxRel = 0;
    for (var i = brushSelection[0]; i <= brushSelection[1]; i += 1.0 / 12) {
      if (graph_data.hasOwnProperty(convertLocalTimeToSettings(i))) {
        var localE = graph_data[convertLocalTimeToSettings(i)];
        for (var j = 0; j < localE.length; ++j) {
          var source = localE[j].source;
          var target = localE[j].target;
          var st_key = source + "$" + target;
          if (func.hasOwnProperty(st_key)) {
            func[st_key][0] = (i - brushSelection[0]) / (brushSelection[1] - brushSelection[0]) * 1.5;
            func[st_key][1] += +localE[j].relativity;
          } else {
            func[st_key] = [(brushSelection[1] - i) / (brushSelection[1] - brushSelection[0]) * 1.5, +localE[j].relativity];
          }
          maxRel = Math.max(maxRel, func[st_key][1]);
        }
      }
    }
    colorScale.domain([0, Math.log(maxRel)]);
    for (var key in func) {
      var ab = key.split("$");
      localD.push({"source": ab[0], "target": ab[1], "relativity": func[key][0], "color": func[key][1]});
    }
    localD.sort(function (a, b) {
      return a.color - b.color;
    });
    for (var i = 0; i < localD.length; ++i)
      localD[i].color = colorScale(Math.log(localD[i].color));
  } else {
    localD = graph_data[settings_time];
  }
  var link = link_group.selectAll("line").data(localD);
  link.exit().remove();
  link.enter().append("line");

  simulation
    .nodes(node_data)
    .on("tick", ticked);

  simulation.force("link")
    .links(localD);
}


function buildGraph(data) {
  graph_data = processLink(data);
  reset();
}

function ticked() {
  link_group.selectAll("line")
    .attr("x1", function (d) {
      return d.source.x;
    })
    .attr("y1", function (d) {
      return d.source.y;
    })
    .attr("x2", function (d) {
      return d.target.x;
    })
    .attr("y2", function (d) {
      return d.target.y;
    })
    .attr("stroke-width", function (d) {
      return +d.relativity * 2;
    })
    .attr("stroke", function (d) {
      if (brushMode && d.hasOwnProperty("color")) return d.color;
      else return "#888";
    });

  node_group.selectAll("circle")
    .attr("cx", function (d) {
      var err = parseInt(d.id) % 50;
      return d.x = Math.max(radius + err, Math.min(width - radius - err, d.x));
    })
    .attr("cy", function (d) {
      var err = parseInt(d.id) % 50;
      return d.y = Math.max(radius + err, Math.min(height - radius - err, d.y));
    })
    .attr("fill", function (d) {
      for (var i = 0; i < watchList.length; ++i)
        if (d.id == watchList[i])
          return color(i);
      return "black";
    })
    .attr("r", function (d) {
      for (var i = 0; i < watchList.length; ++i)
        if (d.id == watchList[i])
          return radius * 1.5;
      return radius;
    });

  simulation.alpha(0.1).restart();
}

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function createSlider() {
  var margin = {right: 50, left: 50};
  var localWidth = width - margin.right - margin.left;

  var x = d3.scaleLinear()
    .domain([1957, 2018])
    .range([0, localWidth])
    .clamp(true);

  var slider = svg.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(" + margin.left + "," + (height - 50) + ")");

  function brushended() {
    if (!d3.event.sourceEvent) return; // Only transition after input.
    if (!d3.event.selection) return; // Ignore empty selections.
    brushSelection = d3.event.selection.map(x.invert);
    brushMode = true;
    reset();
  }

  slider.append("g")
    .attr("class", "brush")
    .call(d3.brushX()
        .extent([[0, 0], [width, 200]])
        .on("end", brushended));

  slider.append("line")
    .attr("class", "track")
    .attr("x1", x.range()[0])
    .attr("x2", x.range()[1])
    .select(function () {
      return this.parentNode.appendChild(this.cloneNode(true));
    })
    .attr("class", "track-inset")
    .select(function () {
      return this.parentNode.appendChild(this.cloneNode(true));
    })
    .attr("class", "track-overlay")
    .call(d3.drag()
      .on("start.interrupt", function () {
        slider.interrupt();
      })
      .on("start drag", function () {
        onChange(x.invert(d3.event.x));
      }));

  slider.insert("g", ".track-overlay")
    .attr("class", "ticks")
    .attr("transform", "translate(0," + 18 + ")")
    .selectAll("text")
    .data(x.ticks(10))
    .enter().append("text")
    .attr("x", x)
    .attr("text-anchor", "middle")
    .text(function (d) {
      return d;
    });

  var handle = slider.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("cx", x(2017))
    .attr("r", 9);

  var handle1 = slider.insert("circle", ".track-overlay")
    .attr("class", "handle1")
    .attr("cx", x(2017))
    .attr("r", 9)
    .attr("opacity", 0);

  function onChange(h) {
    brushMode = false;
    handle.attr("cx", x(h));
    settings_time = convertLocalTimeToSettings(h);
    reset();
  }
}

var watchList = [];
var highlighted = -1;

function updateWatchList() {
  var texts = watchListGroup.selectAll("g").data(watchList);
  texts.exit().remove();
  var new_texts = texts.enter().append("g");
  new_texts.append("circle");
  new_texts.append("text");
  watchListGroup.selectAll("g")
    .on("mouseover", function (d) {
      highlighted = d;
      updateExp();
    })
    .on("mouseout", function (d) {
      highlighted = -1;
      updateExp();
    });
  watchListGroup.selectAll("g")
    .attr("transform", function (d, i) {
      return "translate(0," + (30 * i + 30) + ")";
    })
    .attr("data-index", function (d, i) {
      return i;
    })
    .selectAll("text")
    .attr("x", 30)
    .attr("dy", 20)
    .attr("font-size", 18)
    .text(function (d) {
      return node_data[d]["姓名"];
    });
  watchListGroup.selectAll("g")
    .selectAll("circle")
    .attr("cx", 15)
    .attr("cy", 15)
    .attr("r", 8)
    .attr("fill", function (d, i) {
      return color(this.parentNode.getAttribute("data-index"));
    });
  watchListGroup.moveToFront();
}

function updateExp() {
  if (highlighted >= 0) {
    var text = node_data[highlighted]["履历"];
    expGroup.html(text.replaceAll('\n', '<br>'));
    expGroup.fadeTo(500, 1);
  } else {
    expGroup.fadeTo(500, 0);
  }
}

createSlider();
setTimeout(updateWatchList, 1000);
