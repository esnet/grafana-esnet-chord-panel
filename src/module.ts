import {
  FieldOverrideContext,
  getFieldDisplayName,
  PanelPlugin,
  FieldConfigProperty,
  FieldColorModeId,
} from "@grafana/data";

import { ChordOptions } from "./types";
import { esnetChord } from "./esnetChord";

/**
 * Grafana panel plugin main module
 *
 * @param {*} { panel: React.ComponentType<PanelProps<NetSageSankeyOptions>> | null }
 * @return {*} { builder: PanelOptionsEditorBuilder<NetSageSankeyOptions> }
 */
const OptionsCategory = ["Display"];

export const plugin = new PanelPlugin<ChordOptions>(esnetChord);

plugin.setPanelOptions((builder) => {
  builder.addSelect({
    path: "targetField",
    name: "Target Field",
    description: "Select the field to use as the target ",
    category: OptionsCategory,
    settings: {
      allowCustomValue: false,
      options: [],
      getOptions: async (context: FieldOverrideContext) => {
        const options = [];
        if (context && context.data) {
          for (const frame of context.data) {
            for (const field of frame.fields) {
              const name = getFieldDisplayName(field, frame, context.data);
              const value = name;
              options.push({ value, label: name });
            }
          }
        }
        return Promise.resolve(options);
      },
    },
    //---- todo: figure out how to guess at a default for these
    //defaultValue: options[1],
  });
  builder.addSelect({
    path: "sourceField",
    name: "Source Field",
    description: "Select the fields that should be used as the source",
    category: OptionsCategory,
    settings: {
      allowCustomValue: false,
      options: [],
      getOptions: async (context: FieldOverrideContext) => {
        const options = [];
        if (context && context.data) {
          for (const frame of context.data) {
            for (const field of frame.fields) {
              const name = getFieldDisplayName(field, frame, context.data);
              const value = name;
              options.push({ value, label: name });
            }
          }
        }
        return Promise.resolve(options);
      },
    },
    //defaultValue: options[0],
  });
  builder.addSelect({
    path: "valueField",
    name: "Value Field",
    description: "Select the numeric field used to size and color chords.",
    category: OptionsCategory,
    settings: {
      allowCustomValue: false,
      options: [],
      getOptions: async (context: FieldOverrideContext) => {
        const options = [];
        if (context && context.data) {
          for (const frame of context.data) {
            for (const field of frame.fields) {
              const name = getFieldDisplayName(field, frame, context.data);
              const value = name;
              options.push({ value, label: name });
            }
          }
        }
        return Promise.resolve(options);
      },
    },
    //defaultValue: options[2],
  });
  builder.addNumberInput({
    path: "txtLength",
    name: "Text Length",
    description: "adjust amount of space used for labels",
    category: OptionsCategory,
    settings: {
      placeholder: "Auto",
      integer: true,
      min: 1,
      max: 200,
    },
    defaultValue: 100,
  });
  builder.addSelect({
    path: "colorBy",
    name: "Color By",
    description:
      "Set the chord's color to the source or target of the chord. When a 'by value' color scheme is selected, this has no effect",
    category: OptionsCategory,
    settings: {
      allowCustomValue: false,
      options: [
        { value: "source", label: "Source" },
        { value: "target", label: "Target" },
      ],
    },
    defaultValue: "source",
  });
});

plugin.useFieldConfig({
  disableStandardOptions: [
    FieldConfigProperty.NoValue,
    FieldConfigProperty.Max,
    FieldConfigProperty.Min,
    FieldConfigProperty.DisplayName,
    FieldConfigProperty.Thresholds,
  ],
  standardOptions: {
    [FieldConfigProperty.Color]: {
      settings: {
        byValueSupport: true,
        bySeriesSupport: true,
        preferThresholdsMode: false,
      },
      defaultValue: {
        mode: FieldColorModeId.PaletteClassic,
      },
    },
  },
});

//.useFieldConfig({});
