// Credits
// https://d3-graph-gallery.com/graph/line_confidence_interval.html
// https://github.com/e-/infovis

class LineChart {
  margin = { top: 10, right: 30, bottom: 30, left: 60 };

  constructor(id, data, width = 460, height = 400) {
    this.id = id;
    this.data = data;
    this.width = width - this.margin.left - this.margin.right;
    this.height = height - this.margin.top - this.margin.bottom;
  }
  initialize() {
    this.svg = d3.select(this.id);

    this.container = this.svg.append("g");
    this.xAxis = this.svg.append("g");
    this.yAxis = this.svg.append("g");
    this.legend = this.svg.append("g");

    this.xScale = d3.scaleBand();
    this.yScale = d3.scaleLinear();

    this.svg
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g");

    this.container.attr(
      "transform",
      `translate(${this.margin.left}, ${this.margin.top})`
    );
  }

  update(data, xVar) {
    const categories = [...new Set(data.map((d) => d[xVar]))].sort();
    const counts = {};
    const means = {};
    const stds = {};
    const ciLeft = {};
    const ciRight = {};
    const z = 1.96; // 95% CI

    // Computing CI
    categories.forEach((c) => {
      counts[c] = data.filter((d) => d[xVar] === c).length;
      means[c] =
        data.filter((d) => d[xVar] === c).reduce((a, b) => a + b, 0) /
        counts[c];

      data
        .filter((d) => d[xVar] === c)
        .forEach((item) => {
          stds[c] = Math.sqrt((item - means[c]) / counts[c]);
        });

      ciLeft[c] = means[c] - (z * stds[c]) / Math.sqrt(counts[c]);
      ciRight[c] = means[c] + (z * stds[c]) / Math.sqrt(counts[c]);
    });

    // x-axis : C value
    this.xScale.domain(categories).range([0, this.width]).padding(0.3);
    //   y-axis: Q value
    this.yScale
      .domain([0, d3.max(Object.values(counts))])
      .range([this.height, 0]);

    //   Show confidence interval
    //   TODO
    this.container
      .selectAll("path")
      .data(categories)
      .join("path")
      .attr("fill", "#cce5df")
      .attr("stroke", "none")
      .attr(
        "d",
        d3
          .area()
          .x(function (d) {
            return this.xScale(d);
          })
          .y0(function (d) {
            return this.yScale(ciRight[d]);
          })
          .y1(function (d) {
            return this.yScale(ciLeft[d]);
          })
      );

    //   Update the line
    this.container
      .selectAll("path")
      .data(categories)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return this.xScale(d);
          })
          .y(function (d) {
            return this.yScale(means[d]);
          })
      );

    this.xAxis
      .attr(
        "transform",
        `translate(${this.margin.left}, ${this.margin.top + this.height})`
      )
      .call(d3.axisBottom(this.xScale));

    this.yAxis
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
      .call(d3.axisLeft(this.yScale));
  }
}
