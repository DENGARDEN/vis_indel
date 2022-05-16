// Credits
// https://github.com/e-/infovis
// https://d3-graph-gallery.com/graph/heatmap_tooltip.html
// https://stackoverflow.com/questions/70790223/how-to-sum-the-array-of-object-values-and-assigned-them-to-the-relevant-key-name
// https://observablehq.com/@d3/color-legend
// https://observablehq.com/@slowkow/vertical-color-legend

class Heatmap {
  margin = {
    top: 30,
    right: 180,
    bottom: 30,
    left: 180,
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
    this.spacing = 30;
    this.coloBarWidth = 20;

    this.svg = d3.select(this.svg);
    this.tooltip = d3.select(this.tooltip);
    this.container = this.svg.append("g");
    this.anotherContainer = this.svg.append("g");

    this.xAxis = this.svg.append("g");
    this.yAxis = this.svg.append("g");
    this.legend = this.svg
      .append("g")
      .attr("width", 10)
      .attr("height", this.height)
      .attr("viewBox", [this.width, 0, this.width + 10, this.height])
      .style("overflow", "visible")
      .style("display", "block");

    this.zAxis = this.svg.append("g");

    this.xScale = d3.scaleBand();
    this.yScale = d3.scaleBand();
    this.zScale = d3.scaleLinear();
    this.zScaleForTicks = d3.scaleLinear();
    this.zLabel = this.svg
      .append("g")
      .append("text")
      .attr("x", this.margin.left + this.width - this.spacing)
      .attr("y", this.margin.top)

      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .text("↑ Frequency (%)");

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    this.container.attr(
      "transform",
      `translate(${this.margin.left}, ${this.margin.top})`
    );

    this.anotherContainer.attr(
      "transform",
      `translate(${this.margin.left}, ${this.margin.top})`
    );

    this.xLabel = this.svg.append("g");
    this.yLabel = this.svg.append("g");
    // other initialization logic

    this.brush = d3
      .brush()
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .on("start brush", (event) => {
        this.brushSquares(event);
      });
  }

  update(xVar, yVar, colorVar, data) {
    this.xVar = xVar;
    this.yVar = yVar;
    this.colorVar = colorVar;

    //   Data Pooling
    let temp = [];
    let dPooled = [];
    data.forEach((d) => {
      d[xVar].split(",").forEach((f1) => {
        d[yVar].split(",").forEach((f2) => {
          // Separating multiple occurrences
          if (f1 !== "" && f2 !== "") {
            temp = { ...d };
            temp[xVar] = f1;
            temp[yVar] = f2;
            dPooled.push(temp);
          }
        });
      });
    });

    this.originalData = this.data;
    this.data = dPooled;

    const categoriesX = [...new Set(this.data.map((d) => d[xVar]))].sort(
      (a, b) => a - b
    );
    const categoriesY = [...new Set(this.data.map((d) => d[yVar]))].sort(
      (a, b) => a - b
    );

    const categories_id = [...new Set(this.data.map((d) => d["id"]))].sort(
      (a, b) => a - b
    );

    //   Averaging Q values
    const freqGroupByCoordinate = {};
    const countGroupByCoordinate = {};
    this.data.forEach((d) => {
      let x = d[this.xVar];
      let y = d[this.yVar];

      // Array as a key
      if (!freqGroupByCoordinate[[x, y]]) {
        freqGroupByCoordinate[[x, y]] = 0;
        countGroupByCoordinate[[x, y]] = 0;
      }
      freqGroupByCoordinate[[x, y]] += d[this.colorVar];
      countGroupByCoordinate[[x, y]] += 1;
    });
    // averaging op은 heatmap pos 에 대해 수행해야 험
    categoriesX.forEach((x) =>
      categoriesY.forEach((y) => {
        if (countGroupByCoordinate[[x, y]]) {
          freqGroupByCoordinate[[x, y]] /= countGroupByCoordinate[[x, y]];
        }
      })
    );

    //   Applying averaged value for each position on the heatmap
    this.data.forEach((d) => {
      d[this.colorVar] = freqGroupByCoordinate[[d[this.xVar], d[this.yVar]]];
    });

    this.xScale.domain(categoriesX).range([0, this.width]).padding(0.01);
    this.yScale.domain(categoriesY).range([this.height, 0]).padding(0.01);

    //   Build color scale

    this.zScale
      .range(["white", "steelblue"])
      .domain(d3.extent(this.data, (d) => d[colorVar]));

    this.zScaleForTicks
      .domain(d3.extent(this.data, (d) => d[colorVar]))
      .range([this.height, 0]);

    // implementing color legend
    function ramp(color, n = 256) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = n;
      const context = canvas.getContext("2d");
      for (let i = 0; i < n; ++i) {
        context.fillStyle = color(i / (n - 1));
        context.fillRect(0, n - i, 1, 1);
      }
      return canvas;
    }

    let tickAdjust = (g) =>
      g
        .selectAll(".tick line")
        .attr("x1", this.margin.left - this.width + this.margin.right);
    let x;

    const n = Math.min(this.zScale.domain().length, this.zScale.range().length);
    let y = this.zScale
      .copy()
      .rangeRound(
        d3.quantize(
          d3.interpolate(this.margin.top, this.height - this.margin.bottom),
          n
        )
      );

    this.legend
      .append("image")
      .attr("x", this.margin.left + this.spacing)
      .attr("y", this.margin.top)
      .attr("width", this.coloBarWidth)
      .attr("height", this.height)
      .attr("preserveAspectRatio", "none")
      .attr(
        "xlink:href",
        ramp(
          this.zScale.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
        ).toDataURL()
      )
      .attr("transform", `translate(${this.width}, ${0})`);

    // brush first
    this.anotherContainer.call(this.brush);

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

    this.zAxis
      .attr(
        "transform",
        `translate(${
          this.margin.left + this.width + this.spacing + this.coloBarWidth
        }, ${this.margin.top})`
      )
      .transition()
      .call(d3.axisRight(this.zScaleForTicks));
  }

  // Brushing interaction
  isBrushed(d, selection) {
    let [[x0, y0], [x1, y1]] = selection; // destructuring assignment
    let x = this.xScale(d[this.xVar]);
    let y = this.yScale(d[this.yVar]);

    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  // this method will be called each time the brush is updated.
  brushSquares(event) {
    let selection = event.selection;

    // this.squares.classed("brushed", (d) => this.isBrushed(d, selection));
    let ids = [];
    if (this.handlers.brush)
      this.handlers.brush(
        this.originalData.filter((d) => {
          // Restore and return the original data format

          this.data.forEach((c) => {
            this.isBrushed(c, selection) ? ids.push(c["id"]) : 0;
          });

          return ids.includes(d["id"]);
        })
      );
  }

  on(eventType, handler) {
    this.handlers[eventType] = handler;
  }
}
