export default function layeredAreaChart({ el, data }) {
  // Isometric Projection
  // X = time (left-right)
  // Y = value (up-down)
  // Z = layer (depth, into the screen)

  const COLOR_BG = "#333464";
  const COLOR_TEXT = "#E7E7E7";
  const COLOR_ACCENT = "#01A6AF";

  const xAccessor = (d) => d.year;
  const yAccessor = (d) => d.value;
  const zAccessor = (d) => d.name;

  const yValueFormat = d3.format(",d");
  const xTickFormat = d3.format("d");

  const angle3d = Math.PI / 6;
  const xMaxPx = 400;
  const yMaxPx = 640;
  const zLayerPx = 64;
  const zMaxPx = (data.length - 1) * zLayerPx;
  const margin3d = { top: 8, right: 48, left: 40, bottom: 72 };

  function projection3d(x, y, Z) {
    const X = xScale3d(x);
    const Y = yScale3d(y);
    return [(X - Z) * Math.cos(angle3d), (X + Z) * Math.sin(angle3d) - Y];
  }

  const xScale3d = d3.scaleLinear(d3.extent(data[0].values, xAccessor), [
    0,
    xMaxPx,
  ]);
  const yScale3d = d3.scaleLinear(
    [0, d3.max(data[0].values, yAccessor)],
    [0, yMaxPx],
  );
  const zScale3d = d3
    .scalePoint()
    .domain(data.map(zAccessor))
    .range([0, zMaxPx]);

  const lineGen3d = d3
    .line()
    .x((d) => d[0])
    .y((d) => d[1]);
  const areaGen3d = d3
    .area()
    .x((d) => d[0])
    .y0((d) => d[1])
    .y1((d) => d[2]);

  const curves3d = data.map((d) => {
    const Z = zScale3d(zAccessor(d));
    const pts = d.values.map((v) =>
      projection3d(xAccessor(v), yAccessor(v), Z),
    );
    const bases = d.values.map((v) => projection3d(xAccessor(v), 0, Z));
    return {
      ...d,
      pts,
      linePath: lineGen3d(pts),
      areaPath: areaGen3d(
        d3.zip(pts, bases).map(([[x, y1], [_, y0]]) => [x, y0, y1]),
      ),
      nameLabelPos: bases.at(-1),
      startValueLabelPos: pts.at(0),
      endValueLabelPos: pts.at(-1),
    };
  });

  const xTicks = xScale3d.domain().map((x, i) => ({
    pos0: projection3d(x, 0, 0),
    pos1: projection3d(x, 0, zMaxPx + 32),
    pos: transformText(...projection3d(x, 0, zMaxPx + 32), "top"),
    textAnchor: i === 0 ? "start" : "end",
    dx: i === 0 ? 6 : -6,
    text: xTickFormat(x),
  }));

  const allX3d = curves3d.flatMap((c) => c.pts.map((p) => p[0]));
  const allY3d = curves3d.flatMap((c) => c.pts.map((p) => p[1]));
  const [minX3d, maxX3d] = d3.extent(allX3d);
  const [minY3d, maxY3d] = d3.extent(allY3d);
  const vbX = minX3d - margin3d.left;
  const vbY = minY3d - margin3d.top;
  const vbW = maxX3d - minX3d + margin3d.left + margin3d.right;
  const vbH = maxY3d - minY3d + margin3d.top + margin3d.bottom;

  const container = d3.select(el).classed("layered-area-chart", true);

  const svg = container
    .append("svg")
    .attr("width", vbW)
    .attr("height", vbH)
    .attr("viewBox", [vbX, vbY, vbW, vbH]);

  const xTickG = svg
    .append("g")
    .selectChildren()
    .data(xTicks)
    .join("g")
    .attr("class", "tick");

  xTickG
    .append("line")
    .attr("class", "tick__line")
    .attr("x1", (d) => d.pos0[0])
    .attr("y1", (d) => d.pos0[1])
    .attr("x2", (d) => d.pos1[0])
    .attr("y2", (d) => d.pos1[1]);

  xTickG
    .append("text")
    .attr("class", "tick__label")
    .attr("text-anchor", (d) => d.textAnchor)
    .attr("dx", (d) => d.dx)
    .attr("transform", (d) => d.pos)
    .text((d) => d.text);

  const seriesG = svg
    .append("g")
    .selectChildren()
    .data(curves3d)
    .join("g")
    .attr("class", "series");

  seriesG
    .append("path")
    .attr("class", "series__area")
    .attr("d", (c) => c.areaPath);

  seriesG
    .append("path")
    .attr("class", "series__line")
    .attr("d", (c) => c.linePath);

  seriesG
    .append("text")
    .attr("class", "series__name")
    .attr("dx", 6)
    .attr("dy", "0.32em")
    .attr("transform", (d) => transformText(...d.nameLabelPos, "top"))
    .text(zAccessor);

  seriesG
    .append("g")
    .attr("class", "series__labels")
    .selectChildren()
    .data((d) => [
      {
        pos: transformText(...d.startValueLabelPos, "left"),
        text: yValueFormat(yAccessor(d.values.at(0))),
        dx: -6,
        textAnchor: "end",
      },
      {
        pos: transformText(...d.endValueLabelPos, "left"),
        text: yValueFormat(yAccessor(d.values.at(-1))),
        dx: 6,
        textAnchor: "start",
      },
    ])
    .join("text")
    .attr("class", "series__label")
    .attr("text-anchor", (d) => d.textAnchor)
    .attr("dx", (d) => d.dx)
    .attr("dy", "0.32em")
    .attr("transform", (d) => d.pos)
    .text((d) => d.text);

  function transformText(x, y, plane) {
    const c = Math.cos(angle3d);
    const s = Math.sin(angle3d);
    switch (plane) {
      case "top":
        return `matrix(${c}, ${s}, ${-c}, ${s}, ${x}, ${y})`;
      case "left":
        return `matrix(${c}, ${s}, 0, 1, ${x}, ${y})`;
      case "right":
        return `matrix(${c}, ${-s}, 0, 1, ${x}, ${y})`;
      default:
        throw new Error("Unknown plane " + plane);
    }
  }
}
