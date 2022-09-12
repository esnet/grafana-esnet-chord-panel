# <span style="color:#4EC1E0; font-weight:bold">Chord Panel Plugin</span>



This is a panel plugin for generating Chord diagrams in Grafana 8.3+. This plugin uses a locally included version of [d3](https://github.com/d3/d3).

![Screenshot](https://github.com/esnet/grafana-esnet-chord-panel/blob/main/src/img/Chord-Example.png?raw=true)

## <span style="color:#6D6E71; font-weight:bold">Data</span>
This plugin uses non time series data and requires each row to have 2 data fields and a metric or value field.

**NOTE**: If the panel is blank even though your data input is correct, it may be too small.  Try resizing the panel until it is large enough to display the chord diagram.

## <span style="color:#6D6E71; font-weight:bold">Customizing</span>
### <span style="color:#FF780C; font-weight:bold">Display</span>
<span style="color:#6D6E71; font-weight:bold">Source Field:</span> The query field to use as the source of the chord.

<span style="color:#6D6E71; font-weight:bold">Target Field:</span> The query field to use as the target of the chord.

<span style="color:#6D6E71; font-weight:bold">Value Field:</span> The query field (usually the metric) to be used to determine the thickness of the each chord.

<span style="color:#6D6E71; font-weight:bold">Text Length:</span> The amount of space alloted for labels on the outside of the diagram.

### <span style="color:#FF780C; font-weight:bold">Standard</span>
<span style="color:#6D6E71; font-weight:bold">Units:</span> Set the units for the values in the Standard Options section.