// Credits
// https://d3-graph-gallery.com/graph/line_confidence_interval.html
// https://github.com/e-/infovis
// https://observablehq.com/@d3/band-chart
class LineChart {
  margin = { top: 10, right: 10, bottom: 40, left: 40 };

  constructor(svg, tooltip, width = 600, height = 250) {
    this.svg = svg;
    this.width = width;
    this.height = height;
    this.tooltip = tooltip;
  }

  initialize() {
    this.svg = d3.select(this.svg);
    this.container = this.svg.append("g");
    this.xAxis = this.svg.append("g");
    this.yAxis = this.svg.append("g");
    this.legend = this.svg.append("g");

    this.xScale = d3.scaleBand();
    this.yScale = d3.scaleLinear();

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    this.container.attr(
      "transform",
      `translate(${this.margin.left}, ${this.margin.top})`
    );

    this.line = this.container.append("g");
    this.ciArea = this.container.append("g");

    this.tooltip = d3.select(this.tooltip);

    this.circles = this.svg.append("svg");
  }

  update(data, xVar) {
    const categories = [...new Set(data.map((d) => d[xVar]))].sort(
      (a, b) => a - b
    );

    const counts = {};
    const means = {};
    const stdevs = {};
    const ciLeft = {};
    const ciRight = {};
    const z = 1.96; // 95% CI

    // Computing CI for each grouping
    categories.forEach((c) => {
      counts[c] = data.filter((d) => d[xVar] === c).length;
      means[c] =
        data
          .filter((d) => d[xVar] === c)
          .map((d) => d["Indel frequency (%)"])
          .reduce((a, b) => a + b, 0) / counts[c];

      stdevs[c] = Math.sqrt(
        data
          .filter((d) => d[xVar] === c)
          .map((d) => d["Indel frequency (%)"])
          .map((freq) => Math.pow(freq - means[c], 2))
          .reduce((a, b) => a + b, 0) / counts[c]
      );

      ciLeft[c] = means[c] - (z * stdevs[c]) / Math.sqrt(counts[c]);
      ciRight[c] = means[c] + (z * stdevs[c]) / Math.sqrt(counts[c]);
    });

    // x-axis : C value
    this.xScale.domain(categories).range([0, this.width]).padding(1);
    //   y-axis: Q value
    this.yScale
      .domain([0, d3.max(Object.values(ciRight))])
      .range([this.height, 0]);

    // drawing CI
    // remove preceding area
    this.ciArea.selectAll("*").remove();
    // Show confidence interval
    let CI_Area = d3
      .area()
      .x((d) => this.xScale(d))
      .y0((d) => this.yScale(ciLeft[d]))
      .y1((d) => this.yScale(ciRight[d]));

    this.ciArea
      .append("path")
      .datum(...categories)
      .join(
        ((enter) => enter.append("path"),
        (update) => update,
        (exit) => exit.remove())
      )
      .attr("x", (d) => this.xScale(d))
      .style("fill", "steelblue")
      .style("stroke", "none")
      .attr("d", CI_Area(categories))
      .style("opacity", 0.2);

    //   drawing main line
    // plotting data points
    this.circles = this.container
      .selectAll("circle")
      .data(data)
      .join("circle")
      .on("mouseover", (e, d) => {
        this.tooltip
          .select(".tooltip-inner")
          .html(
            `${xVar}: ${d[xVar]}<br />mean freq.: ${
              means[d[xVar]]
            }<br />Upper: ${ciRight[d[xVar]]}<br />Lower: ${ciLeft[d[xVar]]}`
          );
        Popper.createPopper(e.target, this.tooltip.node(), {
          placement: "top",
          modifiers: [
            {
              name: "arrow",
              options: {
                element: this.tooltip.select(".tooltip-arrow").node(),
              },
            },
          ],
        });
        this.tooltip.style("display", "block");
      })
      .on("mouseout", (e) => {
        this.tooltip.style("display", "none");
      });

    this.circles

      .attr("cx", (d) => this.xScale(d[xVar]))
      .attr("cy", (d) => this.yScale(means[d[xVar]]))
      .attr("r", 15)
      .attr("fill", "currentColor")
      .style("opacity", 0);

    //   callback for mean values
    let meanLine = (d) => {
      return d3.line()(
        categories.map((d) => [this.xScale(d), this.yScale(means[d])])
      );
    };

    this.line
      .selectAll("path")
      .data(categories)
      .join("path")
      .attr("x", (d) => this.xScale(d))
      .attr("d", meanLine)
      .style("fill", "none")
      .style("stroke", "steelblue")
      .attr("stroke-width", 2);

    this.xAxis
      .attr(
        "transform",
        `translate(${this.margin.left}, ${this.margin.top + this.height})`
      )
      .call(d3.axisBottom(this.xScale))
      .call((g) =>
        g
          .append("text")
          .attr("x", this.width)
          .attr("y", this.margin.top + 20)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text(`${xVar}`)
      );

    this.yAxis
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
      .call(d3.axisLeft(this.yScale))
      .call((g) =>
        g
          .append("text")
          .attr("x", -this.margin.left)
          .attr("y", 0)

          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Frequency (%) with 95% CI")
      );
  }
}
