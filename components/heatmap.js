// Credits
// https://github.com/e-/infovis
// https://d3-graph-gallery.com/graph/heatmap_tooltip.html
class Heatmap {
  margin = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 30,
  };

  constructor(svg, tooltip, data, width = 500, height = 500) {
    // THE CORE PART
    this.svg = svg;
    this.tooltip = tooltip;
    this.data = data;
    this.width = width;
    this.height = height;
    this.handlers = {};
  }

  initialize() {
    this.svg = d3.select(this.svg);
    this.tooltip = d3.select(this.tooltip);
    this.container = this.svg.append("g");
    this.xAxis = this.svg.append("g");
    this.yAxis = this.svg.append("g");
    this.legend = this.svg.append("g");

    this.xScale = d3.scaleBand();
    this.yScale = d3.scaleBand();
    this.zScale = d3.scaleLinear();

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    this.container.attr(
      "transform",
      `translate(${this.margin.left}, ${this.margin.top})`
    );

    // other initialization logic

    this.brush = d3
      .brush()
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .on("start brush", (event) => {
        this.brushCircles(event);
      });
  }

  // TODO
  update(xVar, yVar, colorVar, data) {
    this.xVar = xVar;
    this.yVar = yVar;
    this.colorVar = colorVar;
    const categoriesX = [...new Set(data.map((d) => d[xVar]))].sort(
      (a, b) => a - b
    );
    const categoriesY = [...new Set(data.map((d) => d[yVar]))].sort(
      (a, b) => a - b
    );

    //   TODO
    // //   Data Pooling
    // let temp = [];
    // let dX = [];
    // data.forEach((d) => {
    //   d[xVar].split(",").forEach((type) => {
    //     // Separating multiple occurrences
    //     if (type !== "") {
    //       temp = { ...d };
    //       temp[xVar] = type;
    //       dX.push(temp);
    //     }
    //   });
    // });
    // temp = [];
    // let dY = [];

    // data.forEach((d) => {
    //   d[yVar].split(",").forEach((type) => {
    //     // Separating multiple occurrences
    //     if (type !== "") {
    //       temp = { ...d };
    //       temp[yVar] = type;
    //       dY.push(temp);
    //     }
    //   });
    // });

    this.xScale.domain(categoriesX).range([0, this.width]).padding(0.01);
    this.yScale.domain(categoriesY).range([this.height, 0]).padding(0.01);

    //   Build color scale
    this.zScale
      .range(["white", "steelblue"])
      .domain(d3.extent(this.data, (d) => d[colorVar]));

    // brush first
    this.container.call(this.brush);

    //   Add the squares
    //   data -> this.data
    this.squares = this.container
      .selectAll("rect")
      .data(this.data)
      .join("rect")
      .on("mouseover", (e, d) => {
        //   Create a tooltip
        this.tooltip.style("display", "block");
        this.tooltip
          .select(".tooltip-inner")
          .html(
            `${this.xVar}: ${d[this.xVar]}<br />${this.yVar}: ${
              d[this.yVar]
            }<br />${this.colorVar}: ${d[this.colorVar]}`
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
      })
      .on("mouseout", (e) => {
        this.tooltip.style("display", "none");
      });

    this.squares
      .transition()
      .attr("x", (d) => this.xScale(d[xVar]))
      .attr("y", (d) => this.yScale(d[yVar]))
      .attr("width", this.xScale.bandwidth())
      .attr("height", this.yScale.bandwidth())
      .style("fill", (d) => this.zScale(d[colorVar]));

    this.xAxis
      .attr(
        "transform",
        `translate(${this.margin.left}, ${this.margin.top + this.height})`
      )
      .transition()
      .call(d3.axisBottom(this.xScale));

    this.yAxis
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
      .transition()
      .call(d3.axisLeft(this.yScale));
  }
  isBrushed(d, selection) {
    let [[x0, y0], [x1, y1]] = selection; // destructuring assignment
    let x = this.xScale(d[this.xVar]);
    let y = this.yScale(d[this.yVar]);

    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  // this method will be called each time the brush is updated.
  brushCircles(event) {
    let selection = event.selection;

    this.circles.classed("brushed", (d) => this.isBrushed(d, selection));

    if (this.handlers.brush)
      this.handlers.brush(
        this.data.filter((d) => this.isBrushed(d, selection))
      );
  }

  on(eventType, handler) {
    this.handlers[eventType] = handler;
  }
}
