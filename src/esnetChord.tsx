import React from 'react';
import {PanelProps} from '@grafana/data';
import {ChordOptions} from 'types';
// import * as d3 from 'd3';

import * as chord from './chord.js';

interface Props extends PanelProps<ChordOptions> {}

export const esnetChord: React.FC<Props> = ({
  options,
  data,
  width,
  height,
  id,
}) => {
  const ref = chord.chord(
      data,
      options.sourceField,
      options.targetField,
      options.valueField,
      height,
      options.txtLength,
      options.colorBySource,
      options.pointLength,
  );
  return <svg ref={ref} width={width} height={height}></svg>;
};
