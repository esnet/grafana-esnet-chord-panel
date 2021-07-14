import { useD3 } from './useD3.js';
import * as d3 from './d3.min.js';
import {wordWrap} from './word_wrap.js';
import {DataFrameView } from '@grafana/data';


function createViz(elem,height,data,src,target,val,txtLen){
  //--- do a bit of work to setup the visual layout of the wiget --------
  if( elem  === null){
    console.log("bailing after failing to find parent element");
    return;
  }
  while (elem !== undefined && elem.firstChild){
    //--- clear out old contents
    elem.removeChild(elem.lastChild);
  }
 

  let svg = d3.select(elem);

  svg.attr("viewBox", [-height / 2, -height / 2, height, height]);

  const diameter = height;
  const radius = diameter / 2 ;

  if(radius < 180){
    //-- too small to do anything useful
    console.log("too small to render");
    return;
  }

  const innerRadius =  radius - (txtLen+4+12);       //---- leave room for labels on outside
  const outerRadius =  innerRadius + 12;   //---- sets size of outer band



  const frame = data.series[0];
 
  if(frame === null || frame === undefined){
    //--- no data, bail
    console.log("no date , no dice");
    return;
  }

  const view = new DataFrameView(frame);
  const [matrix,names,nameRevIdx] = prepData(view,src,target,val);
  const fieldDisplay = view.getFieldDisplayProcessor(2);    //---- this is making dumb assumption that the quant data we care about is in the 3rd column
							    //---- TODO: convert this to use val field passed in.

  if(matrix === null)return;
 

  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)

  const ribbon = d3.ribbonArrow()
    .radius(innerRadius - 2)
    .padAngle(2 / innerRadius)
    .headRadius(height/20)

  const chord = d3.chordDirected()
    .padAngle( 12 / innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending)


  const chords = chord(matrix);


  //--- build ordinal color scale keyed on index used in the matrix
  let keys = Array.from( nameRevIdx.keys() );
  let color = d3.scaleOrdinal(keys,d3.schemeSet3);

  //-- generate the inner chords
  svg.append("g")
    .attr("fill-opacity", 0.99)
    .selectAll("g")
    .data(chords)
    .join("path")
     .attr("d", ribbon)
     .attr("fill", d => color(d.target.index))
     .attr("stroke", d => d3.color(color(d.target.index)).darker())
     .style("mix-blend-mode", "normal")
     .call(g => g.append("title")
       .text(d => `${nameRevIdx.get(d.source.index)} to ${nameRevIdx.get(d.target.index)} : ${fieldDisplay(d.source.value).text} ${fieldDisplay(d.source.value).suffix}`)
     )
  //--- generate the outer bands and text
  svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
    .selectAll("g")
    .data(chords.groups)
    .join("g")
      .call(g => g.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.index))
        .attr("stroke", d => d3.color(color(d.index)).darker())
	
        .call(g => g.append("title")
	  .text(d => `${nameRevIdx.get(d.index)} Total  : ${fieldDisplay(d.value).text} ${fieldDisplay(d.value).suffix}`)
        )
      )

      .call(g => g.append("g")
        .attr("transform", d => `rotate(${((d.startAngle+d.endAngle)/2) * 180 / Math.PI - 90}) translate(${outerRadius+(txtLen/2)+4},0)`)
	.attr("fill","#333" )
        .append("text") 
          .attr("text-anchor", d => d.startAngle < Math.PI ? "start" : "end")
          .attr("transform", d => d.startAngle >= Math.PI ? "rotate(180)" : null)
	  .text(d => d.endAngle - d.startAngle > .025 ? nameRevIdx.get(d.index) : ". . .") //-- dont show if the "pie" is too small
	  .call(wrap,txtLen)
      )
      .call(g => g.append('line')
	 .attr("transform", d => `rotate(${((d.startAngle+d.endAngle)/2) * 180 / Math.PI - 90}) translate(${outerRadius},0)`)
	 .attr("stroke", d => d3.color(color(d.index)).darker())
         .attr("x2", 4)
      );
}

const wrap = function(text,width){
  text.each(function () {
    let text_elem = d3.select(this);
    let words = text_elem.text().split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    let lineHeight = 1; 
    let dy = .35; 
    let tspan = text_elem.text(null)
              		.append("tspan")
                        .attr("text-anchor","middle")
	   		.attr("x",0)
                        .attr("dy", dy +"em");

    while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text_elem.append("tspan")
                            .attr("text-anchor","middle")
		            .attr("x",0)
                            .attr("dy", .9+ "em")
                            .text(word);
            }
        }
  });
}

//--- this function creates an adjacency matrix to be consumed by the chord function
//--- returns the matrix + forward and reverse lookup Maps to go from source and target id to description
//--- assumes that data coming to us has at least 3 columns if no preferences provided, assumes
//--- the first 3 columns are  source and target dimensions then value to display
function prepData(data,src,target,val){
  //--- create array of names
  let sourceKey = src;
  let targetKey = target;
  let valKey    = val;
  let names = {};

  let err = 0;
  data.forEach((row) => {
    let row_key = Object.keys(row);
    if(sourceKey === undefined)
	  sourceKey = row_key[0];
    if(targetKey === undefined)
	  targetKey = row_key[1];
    if(valKey    === undefined)
	  valKey    = row_key[2];

    let sourceVal = row[sourceKey];
    let targetVal  = row[targetKey];
   
    //--- either the provided keys or the guessed keys arent working
    if(sourceVal === null ||sourceVal === undefined || targetVal === null ||targetVal === undefined){
      console.log("cant fined the source or target in the data set, bailing");
      err = 1;
    }
    names[sourceVal] = 1;
    names[targetVal] = 1;
    
  });

  if(err){
    //--- something is wonky with the data
    return [null,null,null];
  }

  //-- build matrix
  const  name_array = Object.keys(names);
  const  index = new Map( name_array.map(function(name,i){return [name,i];}) );
  const  revIdx = new Map( name_array.map(function(name,i){return [i,name];}) );
  const matrix = Array.from(index, () => new Array(name_array.length).fill(0));
  data.forEach((row) => {
    let s = row[sourceKey];
    let t = row[targetKey];
    let v = row[valKey];   
    matrix[index.get(t)][index.get(s)] += v;  //--- aggregate data 
 });
  return [matrix,index,revIdx];

}

function chord(data,src,target,val,height,txtLen){
  //-- some react related voodoo
  const ref = useD3((svg) => {
      createViz(svg,height,data,src,target,val,txtLen);
    });
  return ref;
}


export {chord};
