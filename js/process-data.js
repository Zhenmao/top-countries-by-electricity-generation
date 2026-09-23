d3.csv("data/release_generation_yearly_global.csv", d3.autoType).then(
  (data) => {
    const YEAR_END = 2025;
    const YEAR_START = 2000;
    const VALUE_MIN = 100;

    // Only keep economies whose year end total generation is equal or greater than VALUE_MIN
    const economySet = new Set(
      data
        .filter(
          (d) =>
            d["Area type"] === "Country or economy" &&
            d["Year"] === YEAR_END &&
            d["Electricity source"] === "Total generation" &&
            d["Generation (TWh)"] >= VALUE_MIN,
        )
        .map((d) => d["Area"]),
    );

    // Filter the original data to keep only between year start and year end, Total generation rows
    const filtered = data.filter(
      (d) =>
        economySet.has(d["Area"]) &&
        d["Year"] >= YEAR_START &&
        d["Year"] <= YEAR_END &&
        d["Electricity source"] === "Total generation",
    );

    // Generate the final data with each economy as a single entry
    let grouped = [
      ...d3
        .rollup(
          filtered,
          (v) => ({
            name: v[0]["Area"],
            values: v.map((d) => ({
              year: d["Year"],
              value: d["Generation (TWh)"],
            })),
          }),
          (d) => d["Area"],
        )
        .values(),
    ];

    grouped.sort((a, b) =>
      d3.descending(a.values.at(-1).value, b.values.at(-1).value),
    );

    grouped = grouped.slice(0, 10);

    console.log(grouped);
    console.log(JSON.stringify(grouped));
  },
);
