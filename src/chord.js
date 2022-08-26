import {useD3} from './useD3.js';
import * as d3 from './d3.min.js';
import {
  DataFrameView,
  FieldColorModeId,
  classicColors,
} from '@grafana/data';
import {useTheme} from '@grafana/ui';

/** Create the chord diagram using d3.
 * @param {*} elem The parent svg element that will house this diagram
 * @param {number} height The current height of the panel
 * @param {*} data The data that will populate the diagram
 * @param {string} src The data series that will act as the source
 * @param {string} target The data series that will act as * the target
 * @param {string} val The data series that will act as the value
 * @param {integer} txtLen The amount of spaces used for labels
 * @param {boolean} colorBySource Whether to use the source or target field to
 * decide on chord color
 * @param {integer} pointLength The length of the chord point as a percentage of
 * the digram's radius
 * @param {GrafanaTheme} theme
*/
function createViz(elem, height, data, src, target, val, txtLen,
    colorBySource, pointLength, theme) {
  // do a bit of work to setup the visual layout of the wiget --------
  if ( elem === null) {
    console.log('bailing after failing to find parent element');
    return;
  }
  while (elem !== undefined && elem.firstChild) {
    // clear out old contents
    elem.removeChild(elem.lastChild);
  }

  const svg = d3.select(elem);

  svg.attr('viewBox', [-height / 2, -height / 2, height, height]);

  const diameter = height;
  const radius = diameter / 2;

  if (radius < 180) {
    // too small to do anything useful
    console.log('too small to render');
    return;
  }
  // leave room for labels on outside
  const innerRadius = radius - (txtLen+4+12);
  // sets size of outer band
  const outerRadius = innerRadius + 12;

  const frame = data.series[0];

  if (frame === null || frame === undefined) {
    // no data, bail
    console.log('no data , no dice');
    return;
  }

  const view = new DataFrameView(frame);
  const [matrix, nameRevIdx] = prepData(view, src, target, val);
  // this is making a questionable assumption that the quant data we care about
  // is in the 3rd column
  const fieldDisplay = view.getFieldDisplayProcessor(2);
  // TODO: convert this to use val field passed in.

  if (matrix === null) return;

  const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  const ribbon = d3.ribbonArrow()
      .radius(innerRadius - 2)
      .padAngle(2 / innerRadius)
      .headRadius(innerRadius * (pointLength/100.0));

  const chord = d3.chordDirected()
      .padAngle( 12 / innerRadius)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);


  const chords = chord(matrix);

  // build ordinal color scale keyed on index used in the matrix
  const color = makeColorer(colorBySource, nameRevIdx, frame, src, target, val);

  // generate the inner chords
  svg.append('g')
      .attr('fill-opacity', 0.99)
      .selectAll('g')
      .data(chords)
      .join('path')
      .attr('d', ribbon)
      .attr('fill', (d) => color(d))
      .attr('stroke', (d) => d3.color(color(d)).darker())
      .style('mix-blend-mode', 'normal')
      .call((g) => g.append('title')
          .text((d) => {
            const from = nameRevIdx.get(d.source.index);
            const to = nameRevIdx.get(d.target.index);
            const val = fieldDisplay(d.source.value).text;
            const suffix = fieldDisplay(d.source.value).suffix ? fieldDisplay(d.source.value).suffix: '';
            return `${from} to ${to} : ${val} ${suffix}`;
          }));
  // generate the outer bands and text
  svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .selectAll('g')
      .data(chords.groups)
      .join('g')
      .call((g) => g.append('path')
          .attr('d', arc)
          .attr('fill', (d) => color(d))
          .attr('stroke', (d) => d3.color(color(d)).darker())
          .call((g) => g.append('title')
              .text((d) => {
                const name = nameRevIdx.get(d.index);
                const disp = fieldDisplay(d.value);
                return `${name} Total : ${disp.text} ${disp.suffix}`;
              })))
      .call((g) => g.append('g')
          .attr('transform', (d) => {
            const rot = ((d.startAngle+d.endAngle)/2) * 180 / Math.PI - 90;
            const trans = outerRadius+(txtLen/2)+4;
            return `rotate(${rot}) translate(${trans}, 0)`;
          })
          .attr('fill', theme.colors.text)
          .append('text')
          .attr('text-anchor', (d) => d.startAngle < Math.PI ? 'start' : 'end')
          .attr('transform', (d) => d.startAngle >= Math.PI ?
            'rotate(180)' : null)
          // dont show if the "pie" is too small
          .text((d) => d.endAngle - d.startAngle > .025 ?
            nameRevIdx.get(d.index) : '. . .')
          .call(wrap, txtLen),
      )
      .call((g) => g.append('line')
          .attr('transform', (d) => {
            const rot = ((d.startAngle+d.endAngle)/2) * 180 / Math.PI - 90;
            return `rotate(${rot}) translate(${outerRadius},0)`;
          })
          .attr('stroke', (d) => d3.color(color(d)).darker())
          .attr('x2', 4),
      );
}

const wrap = function(text, width) {
  text.each(function() {
    const textElem = d3.select(this); // eslint-disable-line no-invalid-this
    const words = textElem.text().split(/\s+/).reverse();
    let word;
    let line = [];
    const dy = .35;
    let tspan = textElem.text(null)
        .append('tspan')
        .attr('text-anchor', 'middle')
        .attr('x', 0)
        .attr('dy', dy +'em');

    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = textElem.append('tspan')
            .attr('text-anchor', 'middle')
            .attr('x', 0)
            .attr('dy', .9+ 'em')
            .text(word);
      }
    }
  });
};

/**
 * this function creates an adjacency matrix to be consumed by the chord
 * function returns the matrix + forward and reverse lookup Maps to go from
 * source and target id to description assumes that data coming to us has at
 * least 3 columns if no preferences provided, assumes the first 3 columns are
 * source and target dimensions then value to display
 * @param {*} data Data for the chord diagram
 * @param {string} src The data series that will act as the source
 * @param {string} target The data series that will act as * the target
 * @param {string} val The data series that will act as the value
 * @return {[matrix, namesToIndex]}
 */
function prepData(data, src, target, val) {
  // create array of names
  let sourceKey = src;
  let targetKey = target;
  let valKey = val;
  const names = {};

  let err = 0;
  data.forEach((row) => {
    const rowKey = Object.keys(row);
    if (sourceKey === undefined) {
      sourceKey = rowKey[0];
    }
    if (targetKey === undefined) {
      targetKey = rowKey[1];
    }
    if (valKey === undefined) {
      valKey = rowKey[2];
    }

    const sourceVal = row[sourceKey];
    const targetVal = row[targetKey];

    // either the provided keys or the guessed keys arent working
    if (sourceVal === null ||sourceVal === undefined ||
      targetVal === null ||targetVal === undefined) {
      console.log('can not find the source or target in the data set, bailing');
      err = 1;
    }
    names[sourceVal] = 1;
    names[targetVal] = 1;
  });

  if (err) {
    // something is wonky with the data
    return [null, null, null];
  }

  // build matrix
  const nameArray = Object.keys(names);
  const index = new Map( nameArray.map(function(name, i) {
    return [name, i];
  }) );
  const revIdx = new Map( nameArray.map(function(name, i) {
    return [i, name];
  }) );
  const matrix = Array.from(index, () => new Array(nameArray.length).fill(0));
  data.forEach((row) => {
    // The keys of the names object were coerced to strings. If any values here
    // are not strings, cast them to strings.
    const s = row[sourceKey].toString();
    const t = row[targetKey].toString();
    const v = row[valKey];
    // aggregate data
    matrix[index.get(t)][index.get(s)] += v;
  });
  return [matrix, revIdx];
}

/**
 * Make a function that will take in a chord and return the appropriate color.
 * @param {boolean} colorBySource Whether chords be colord the same as the
 * source of the chord or the target
 * @param {*} nameRevIdx A map of chord endpoints to indices
 * @param {*} frame
 * @param {string} src The data series that will act as the source
 * @param {string} target The data series that will act as * the target
 * @param {string} val The data series that will act as the value
 * @return {*}
 */
function makeColorer(colorBySource, nameRevIdx, frame, src, target, val) {
  let sourceField; let targetField; let valueField = undefined;

  frame.fields.forEach((curr) => {
    if (curr.name == src) {
      sourceField = curr;
    }
    if (curr.name == target) {
      targetField = curr;
    }
    if (curr.name == val) {
      valueField = curr;
    }
  });

  const color = (v) => {
    if (v.hasOwnProperty('source') && v.hasOwnProperty('target')) {
      if (colorBySource) {
        return color(v.source);
      }
      return color(v.target);
    }
    const curr = colorBySource ? sourceField : targetField;
    const colorMode = curr.config.color.mode;

    // Are we in some discreet color mode (i.e. non-graident).
    if (colorMode == FieldColorModeId.PaletteClassic ||
      colorMode == FieldColorModeId.Fixed) {
      const name = nameRevIdx.get(v.index);
      // A mapping override exists for this value
      if (curr.config.mappings.some((v) => v.options.hasOwnProperty(name))) {
        return curr.display(name).color;
      }
      // The classic palette ties a specific color to an entire series. For
      // this plugin, we want to tie a specific color to a value in the series.
      if (colorMode == FieldColorModeId.PaletteClassic) {
        return classicColors[v.index % classicColors.length];
      }
      return curr.display(v.index).color;
    }

    // Otherwise, we're going to look at the value directly to decide on the
    // color.
    return valueField.display(v.value).color;
  };
  return color;
}

/**
 *
 * @param {*} data Data for the chord diagram
 * @param {string} src The data series that will act as the source
 * @param {string} target The data series that will act as * the target
 * @param {string} val The data series that will act as the value
 * @param {number} height Height of panel
 * @param {number} txtLen Space for the text around the chord diagram
 * @param {boolean} colorBySource Should the source or target field be used to
 * color interior chords.
 * @param {number} pointLength The length of the chord point as a percentage of
 * the digram's radius
 * @return {*} A d3 callback
 */
function chord(data, src, target, val, height, txtLen, colorBySource,
    pointLength) {
  const theme = useTheme();
  // some react related voodoo
  const ref = useD3((svg) => {
    createViz(svg, height, data, src, target, val, txtLen,
        colorBySource, pointLength, theme);
  });
  return ref;
}

export {chord};
