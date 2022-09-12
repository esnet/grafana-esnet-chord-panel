import React from 'react';
import {PanelProps} from '@grafana/data';
import {ChordOptions} from 'types';
import {useTheme2} from '@grafana/ui';

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
  if (options.sourceField && options.targetField && options.valueField) {
    console.log(options.sourceField, options.targetField, options.valueField);
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
  } else {
    const theme = useTheme2();
    console.log('missing field options');
    const text = 'Please set Source, Target and Value Field Options';
    return (
      <svg width={width} height={height}>
        <text x="0" y="15" fill={theme.colors.text.primary}>
          {text}
        </text>
      </svg>
    );
  }
};
