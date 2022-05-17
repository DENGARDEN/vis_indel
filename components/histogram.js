// Credits
// https://observablehq.com/@mbostock/the-wealth-health-of-nations
// https://github.com/e-/infovis
// https://observablehq.com/@d3/candlestick-chart
// https://observablehq.com/@d3/box-plot
class Histogram {
  margin = {
    top: 10,
    right: 10,
    bottom: 40,
    left: 40,
  };

  constructor(svg, tooltip, width = 500, height = 250) {
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

    this.CIHigh = this.svg.append("g");
    this.CILow = this.svg.append("g");

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    this.container.attr(
      "transform",
      `translate(${this.margin.left}, ${this.margin.top})`
    );

    this.tooltip = d3.select(this.tooltip);
  }

  update(data, xVar) {
    const categories = [...new Set(data.map((d) => d[xVar]))];
    const counts = {};
    const means = {};
    const stdevs = {};
    const ciLeft = {};
    const ciRight = {};
    const z = 1.96; // 95% CI

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

    this.xScale.domain(categories).range([0, this.width]).padding(0.3);
    this.yScale
      .domain([0, d3.max(Object.values(ciRight))])
      .range([this.height, 0]);

    //   mean
    this.container

      .selectAll("rect")
      .data(categories)
      .join("rect")
      .attr("x", (d) => this.xScale(d))
      .attr("y", (d) => this.yScale(means[d]))
      .attr("width", this.xScale.bandwidth())
      .attr("height", (d) => this.height - this.yScale(means[d]))
      .attr("fill", "steelblue")
      .on("mouseover", (e, d) => {
        this.tooltip
          .select(".tooltip-inner")
          .html(
            `${xVar}: ${d}<br />Mean Freq.: ${
              means[d]
            }<br />Upper: ${ciRight[d]}<br />Lower: ${ciLeft[d]}`
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

    // CI
    this.container
      .selectAll("path")
      .data(categories)
      .join("path")
      .attr("stroke", "currentColor")
      .attr(
        "d",
        (d) => `
        M${this.xScale(d) + this.xScale.bandwidth() / 2},${this.yScale(
          ciRight[d]
        )}
        V${this.yScale(ciLeft[d])}
      `
      )
      .attr("stroke-width", 2);

    this.container
      .selectAll("path.top")
      .data(categories)
      .join("path")
      .attr("stroke", "currentColor")
      .attr(
        "d",
        (d) =>
          `M${
            this.xScale(d) + this.xScale.bandwidth() / 2 - this.margin.left / 2
          },${this.yScale(ciRight[d])}H${
            this.xScale(d) + this.xScale.bandwidth() / 2 + this.margin.left / 2
          })}`
      )
      .attr("stroke-width", 2);

    this.container
      .selectAll("path.bottom")
      .data(categories)
      .join("path")
      .attr("stroke", "currentColor")
      .attr(
        "d",
        (d) =>
          `M${
            this.xScale(d) + this.xScale.bandwidth() / 2 - this.margin.left / 2
          },${this.yScale(ciLeft[d])}H${
            this.xScale(d) + this.xScale.bandwidth() / 2 + this.margin.left / 2
          })}`
      )
      .attr("stroke-width", 2);

    this.xAxis
      .attr(
        "transform",
        `translate(${this.margin.left}, ${this.margin.top + this.height})`
      )
      .call(d3.axisBottom(this.xScale));

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
          .text("↑ Frequency (%)")
      );
  }
}
