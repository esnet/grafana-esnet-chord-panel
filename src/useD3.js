import React from 'react';
import * as d3 from './d3.min.js';

export const useD3 = (renderFn, dependencies) => {
    const ref = React.useRef();

    React.useEffect(() => {
        renderFn(ref.current);
        return () => {};
      });
    return ref;
}
