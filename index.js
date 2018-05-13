var width = document.getElementById("body").clientWidth;
var height = document.getElementById("body").clientHeight;

var svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

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
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return "<strong>姓名: </strong>" + d["姓名"] + "<br>" +
      "<strong>担任职务: </strong>" + d["担任职务"] + "<br>";
  });

d3.csv("data1.csv").then(function (data) {
  node_data = data;
  node_group.call(tip);

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
    .on('mouseout', tip.hide);

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
  var localD = graph_data[settings_time];

  console.log(settings_time);
  console.log(localD);

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
    });

  node_group.selectAll("circle")
    .attr("cx", function (d) {
      return d.x = Math.max(radius, Math.min(width - radius, d.x));
    })
    .attr("cy", function (d) {
      return d.y = Math.max(radius, Math.min(height - radius, d.y));
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

  function onChange(h) {
    handle.attr("cx", x(h));
    var year = Math.floor(h);
    var month = Math.floor((h - year) * 12) + 1;
    settings_time = year * 100 + month;
    reset();
  }
}

createSlider();