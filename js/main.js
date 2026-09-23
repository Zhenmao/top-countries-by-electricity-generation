import layeredAreaChart from "./layered-area-chart.js";

d3.json("data/data.json").then((data) => {
  layeredAreaChart({
    el: document.querySelector("#figure"),
    data,
  });
});
