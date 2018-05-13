var width = document.getElementById("body").clientWidth;
var height = document.getElementById("body").clientHeight;

var svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

var color = d3.scaleOrdinal(d3.schemeCategory10);

var simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(function (d) {
    return d.id;
  }))
  .force("charge", d3.forceManyBody())
  .force("center", d3.forceCenter(width / 2, height / 2));

d3.csv("data.csv").then(function (data) {
  console.log(data);
});

d3.json("link.json").then(function (graph) {
  console.log(graph);

  var link_group = svg.append("g")
    .attr("class", "links");
  var link = svg.selectAll("line");

  var node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
    .attr("r", 5)
    .attr("fill", function (d) {
      return color(d.group);
    })
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  node.append("title")
      .text(function(d) { return d.id; });

  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);

  function randint(a, b) {
    return Math.round(Math.random() * (b - a) + a);
  }

  function reset() {
    // graph.links = [];
    // for (var i = 0; i < 100; ++i) {
    //   graph.links.push({
    //     "source": graph.nodes[randint(1, 70)].id,
    //     "target": graph.nodes[randint(1, 70)].id,
    //     "value": randint(1, 10)
    //   });
    // }

    link = link_group.selectAll("line").data(graph.links);
    link.exit().remove();
    link.enter().append("line");
    simulation.force("link")
      .links(graph.links);
  }

  reset();
  setInterval(reset, 1000);

  function ticked() {
    link
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
        return Math.sqrt(d.value);
      });

    node
      .attr("cx", function (d) {
        return d.x;
      })
      .attr("cy", function (d) {
        return d.y;
      });

    simulation.alpha(0.1).restart();
  }
});

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
    .domain([0, 180])
    .range([0, localWidth])
    .clamp(true);

  var slider = svg.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(" + margin.left + "," + height / 2 + ")");

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
        hue(x.invert(d3.event.x));
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
      return d + "°";
    });

  var handle = slider.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 9);

  slider.transition() // Gratuitous intro!
    .duration(750)
    .tween("hue", function () {
      var i = d3.interpolate(0, 70);
      return function (t) {
        hue(i(t));
      };
    });

  function hue(h) {
    handle.attr("cx", x(h));
    svg.style("background-color", d3.hsl(h, 0.8, 0.8));
  }
}

createSlider();