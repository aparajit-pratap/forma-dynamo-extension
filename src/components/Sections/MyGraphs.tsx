import { useCallback, useEffect, useState } from "preact/hooks";
import { JSONGraph } from "../../types/types";
import { Delete } from "../../icons/Delete";
import { File } from "../../icons/File";
import Logo from "../../assets/Logo.png";
import { DynamoState } from "../../DynamoConnector";
import { DynamoService, FolderGraphInfo, GraphInfo } from "../../service/dynamo";
import { filterForSize } from "../../utils/filterGraph";
import { DropZone } from "../DropZone";
import { captureException } from "../../util/sentry";

type DynamoGraph = {
  Name: string;
  Description: string;
  Author: string;
  Thumbnail: string;
  [key: string]: any;
};

function storeGraphs(graphs: any[]) {
  localStorage.setItem("dynamo-graphs", JSON.stringify(graphs));

  return graphs;
}

export function useLocalOpenGraph(
  state: DynamoState,
  dynamoService: DynamoService & { current: () => Promise<GraphInfo> },
) {
  const [suggestOpenGraph, setSuggestOpenGraph] = useState<GraphInfo | null>(null);

  useEffect(() => {
    function handler() {
      if (state.connectionState === "CONNECTED") {
        dynamoService
          .current()
          .then((currentGraph) => {
            if (currentGraph && currentGraph.id) {
              setSuggestOpenGraph(currentGraph);
            }
          })
          .catch((e: Error) => {
            console.error(e);
          });
      }
    }

    const interval = setInterval(handler, 1000);
    handler();

    return () => clearInterval(interval);
  }, [dynamoService, state.connectionState]);

  return suggestOpenGraph;
}

export function MyGraphs({
  setEnv,
  setGraph,
  dynamoLocal,
}: {
  setEnv: (v: "daas" | "local") => void;
  setGraph: (v: FolderGraphInfo | JSONGraph) => void;
  dynamoLocal: {
    state: DynamoState;
    dynamo: DynamoService;
  };
}) {
  const graphs = () => {
    try {
      return JSON.parse(localStorage.getItem("dynamo-graphs") || "[]");
    } catch (e) {
      captureException(e, "Error parsing local graphs");
      return [];
    }
  };

  const localOpenGraph = useLocalOpenGraph(
    dynamoLocal.state,
    dynamoLocal.dynamo as DynamoService & { current: () => Promise<GraphInfo> },
  );

  const [dropped, setDropped] = useState<any[]>(graphs);

  const addDropped = useCallback(
    (graph: DynamoGraph) => {
      const filtered = filterForSize(graph);

      setDropped((prev) => {
        if (!prev) {
          return storeGraphs([filtered]);
        }
        return storeGraphs([...prev, filtered]);
      });
    },
    [setDropped],
  );

  const removeDropped = useCallback(
    (index: number) => {
      setDropped((prev) => {
        if (!prev) {
          return storeGraphs(prev);
        }
        return storeGraphs(prev.filter((_, i) => i !== index));
      });
    },
    [setDropped],
  );

  const openDroppedGraph = useCallback(
    (graph: any) => {
      setGraph({
        id: "2",
        type: "JSON",
        name: graph.Name,
        graph,
      });
    },
    [setGraph],
  );

  return (
    <>
      <h4>My graphs</h4>
      <DropZone
        parse={async (file: File) => JSON.parse(await file.text())}
        filetypes={[".dyn"]}
        onFileDropped={addDropped}
      />

      {localOpenGraph && (
        <div
          style={{
            margin: "8px 8px 8px 0px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "colum" }}>
            <img style={{ margin: "4px 4px 4px 2px" }} src={Logo} />
            <div style={{ height: "24px", alignContent: "center" }}>
              {localOpenGraph.name || "Untitled"}.dyn
            </div>
          </div>

          <weave-button
            onClick={() => {
              setEnv("local");
              setGraph({
                type: "FolderGraph",
                id: localOpenGraph.id,
                name: localOpenGraph.name || "Untitled",
                metadata: localOpenGraph.metadata,
              });
            }}
          >
            Open
          </weave-button>
        </div>
      )}

      {!!dropped?.length &&
        dropped?.map((graph, i) => (
          <div
            key={graph.Id}
            style={{
              margin: "8px 4px 8px 4px",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "colum" }}>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  margin: "4px 4px 4px 0",
                  backgroundColor: "#3C3C3C",
                  borderRadius: "4px",
                  justifyContent: "center",
                  alignItems: "center",
                  display: "flex",
                }}
              >
                <File />
              </div>
              <div style={{ height: "24px", alignContent: "center" }}>{graph.Name}.dyn</div>
            </div>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <div
                style={{
                  cursor: "pointer",
                  margin: "3px",
                }}
                onClick={() => removeDropped(i)}
              >
                <Delete />
              </div>
              <weave-button variant="solid" onClick={() => openDroppedGraph(graph)}>
                Open
              </weave-button>
            </div>
          </div>
        ))}
    </>
  );
}
