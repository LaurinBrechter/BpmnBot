import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import './style.css';

const container = document.querySelector('#canvas');

const modeler = new BpmnModeler({
    container
  });


var diagram_gen = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="4.1.0" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1" name="StartEvent_1" />
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="182" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="168" y="125" width="64" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`

async function openDiagram(bpmnXML) {

    try {

      await modeler.importXML(bpmnXML);

      // access modeler components
      var canvas = modeler.get('canvas');
    //   var overlays = modeler.get('overlays');


      // zoom to fit full viewport
      canvas.zoom('fit-viewport');

      // attach an overlay to a node
    //   overlays.add('SCAN_OK', 'note', {
    //     position: {
    //       bottom: 0,
    //       right: 0
    //     },
    //     html: '<div class="diagram-note">Mixed up the labels?</div>'
    //   });

      // add marker
    //   canvas.addMarker('SCAN_OK', 'needs-discussion');
    } catch (err) {

      console.error('could not import BPMN 2.0 diagram', err);
    }
  }

export async function exportDiagram() {

    try {

    var result = await modeler.saveXML({ format: true });

    alert('Diagram exported. Check the developer tools!');

    console.log('DIAGRAM', result.xml);
    } catch (err) {

    console.error('could not save BPMN 2.0 diagram', err);
    }
}

export function addElement() {
    const bpmnFactory = modeler.get('bpmnFactory'),
        elementFactory = modeler.get('elementFactory'),
        elementRegistry = modeler.get('elementRegistry'),
        modeling = modeler.get('modeling');

        const process = elementRegistry.get('Process_1')

        console.log(process)

        const startEvent = elementRegistry.get('StartEvent_1');

        // You can access the start event's business object
        console.log(startEvent.businessObject); 
}

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

// https://stackoverflow.com/questions/24816/escaping-html-strings-with-jquery
function escapeHtml (string) {
return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
});
}

export async function OpenAICompletion() {

    const currentXML = await modeler.saveXML({ format: true });

    $.ajax({
      url: 'https://api.openai.com/v1/chat/completions',
      type: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + $('#openai-api-token').val()
      },
      data: JSON.stringify({
        "model": "gpt-4o-mini",
        "response_format": {"type": "json_object"},
        "messages": [
          {
            "role": "system",
            "content": `You are a Business Process Modeling Notation (BPMN) expert. You are helping a user create a BPMN diagram.
            This is the current XML of the diagram: ${currentXML.xml}. You MUST repond with a json object that has a key 'xml' and the value should be the XML. Do not add anything else to the reponse.`
          },
          {
            "role": "user",
            "content": $('#chat-input').val()
          }
        ]
      }),
      success: function (response) {
        // Handle response here
        const result = response.choices[0].message.content;

        console.log(result);
        
        const resultJSON = JSON.parse(result);

        openDiagram(resultJSON.xml);

        $('#version-list').append(`<li>${escapeHtml(result)}</li>`);

      },
      error: function (xhr, status, error) {
        // Handle errors here
        console.error(xhr.responseText);
      }
    });
  }


openDiagram(diagram_gen)

$('#save-button').click(exportDiagram);
$('#add-element').click(addElement);
$('#chat-send').click(OpenAICompletion);