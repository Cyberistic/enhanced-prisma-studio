import { AlertCircle, KeyRound, SquareArrowRight } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  ConnectionLineType,
  Controls,
  type Edge,
  type EdgeChange,
  Handle,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  Position,
} from "reactflow";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "reactflow/dist/style.css";

export type VisualizerField = {
  foreignKeyTo?: { column: string; table: string };
  isForeignKey?: boolean;
  isNullable?: boolean;
  isPrimary?: boolean;
  name: string;
  type: string;
};

export type VisualizerTable = {
  fields: VisualizerField[];
  name: string;
};

export type VisualizerRelationship = {
  from: string;
  to: string;
  type: string;
};

type TableNodeData = {
  fields: VisualizerField[];
  label: string;
  onOpenTable?: (tableName: string) => void;
};

function IconWithTooltip(props: { className?: string; icon: React.ReactNode; tooltip: string }) {
  const { className, icon, tooltip } = props;

  return (
    <Tooltip>
      <TooltipTrigger className={className}>{icon}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

const TableNode = memo(function TableNode(props: NodeProps<TableNodeData>) {
  const { data } = props;
  const isNoTablesNode = data.label === "No Tables Found";

  function getFieldIcons(field: VisualizerField) {
    const icons: React.ReactNode[] = [];

    if (isNoTablesNode && field.type === "info") {
      icons.push(
        <IconWithTooltip
          key="info"
          icon={<AlertCircle size={16} />}
          tooltip="Informational message"
        />,
      );
      return icons;
    }

    if (field.isPrimary) {
      icons.push(
        <IconWithTooltip
          key="primary"
          className="flex size-5 items-center justify-center rounded-full bg-muted p-0.5 text-muted-foreground"
          icon={<KeyRound className="size-3 text-primary" />}
          tooltip="Primary Key"
        />,
      );
    } else if (field.isNullable) {
      icons.push(
        <IconWithTooltip
          key="nullable"
          className="flex size-5 items-center justify-center rounded-full bg-muted p-0.5 text-muted-foreground"
          icon={
            <span className="inline-flex size-4 items-center justify-center text-center">?</span>
          }
          tooltip="Nullable"
        />,
      );
    }

    if (field.isForeignKey) {
      const foreignKeyTarget = field.foreignKeyTo;
      const tooltip = foreignKeyTarget
        ? `Foreign key to ${foreignKeyTarget.table}.${foreignKeyTarget.column}`
        : "Foreign Key";

      icons.push(
        <IconWithTooltip
          key="foreign"
          className="flex size-5 items-center justify-center rounded-full bg-primary p-0.5 text-primary-foreground"
          icon={<KeyRound className="size-3" />}
          tooltip={tooltip}
        />,
      );
    }

    return icons;
  }

  return (
    <TooltipProvider delay={250}>
      <div
        className={cn(
          "min-w-62.5 overflow-hidden rounded-md border border-border bg-card shadow-xl",
          isNoTablesNode && "border-orange-400",
        )}
      >
        <Handle position={Position.Top} style={{ opacity: 0 }} type="target" />

        <div
          className={cn(
            "flex items-center justify-between border-b border-border px-4 py-3",
            isNoTablesNode &&
              "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
          )}
        >
          <div className="font-semibold">{data.label}</div>
          {!isNoTablesNode ? (
            <Button
              aria-label={`Open table ${data.label}`}
              className="size-7"
              size="icon"
              variant="ghost"
              onClick={() => data.onOpenTable?.(data.label)}
            >
              <SquareArrowRight data-icon="inline-start" />
            </Button>
          ) : null}
        </div>

        <div className="px-4 py-2">
          {isNoTablesNode ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <AlertCircle className="size-4" />
              <span>No database tables found for this schema.</span>
            </div>
          ) : (
            data.fields.map((field) => (
              <div
                key={`${data.label}.${field.name}`}
                className={cn(
                  "flex items-center gap-2 py-2 text-sm",
                  field.isPrimary && "text-primary",
                )}
              >
                <div className="flex min-w-[calc(1.25rem*2+0.25rem)] items-center gap-1">
                  {getFieldIcons(field).map((icon, index) => (
                    <div key={`${field.name}-icon-${index}`}>{icon}</div>
                  ))}
                </div>
                <span className="max-w-44 flex-1 truncate">{field.name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {field.type}
                </span>
              </div>
            ))
          )}
        </div>

        <Handle position={Position.Bottom} style={{ opacity: 0 }} type="source" />
      </div>
    </TooltipProvider>
  );
});

const nodeTypes = {
  tableNode: TableNode,
} as NodeTypes;

function getLayoutedNodes(args: {
  onOpenTable?: (tableName: string) => void;
  tables: VisualizerTable[];
}): Node<TableNodeData>[] {
  const { onOpenTable, tables } = args;

  if (tables.length === 0) {
    return [
      {
        data: {
          fields: [{ name: "message", type: "info" }],
          label: "No Tables Found",
          onOpenTable,
        },
        id: "__no_tables__",
        position: { x: 120, y: 90 },
        type: "tableNode",
      },
    ];
  }

  if (tables.length <= 3) {
    return tables.map((tableItem, index) => ({
      data: {
        fields: tableItem.fields,
        label: tableItem.name,
        onOpenTable,
      },
      id: tableItem.name,
      position: { x: 350 * index, y: 50 },
      type: "tableNode",
    }));
  }

  const gridGapX = 350;
  const gridGapY = 300;
  const columnCount = Math.ceil(Math.sqrt(tables.length));

  return tables.map((tableItem, index) => {
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);

    return {
      data: {
        fields: tableItem.fields,
        label: tableItem.name,
        onOpenTable,
      },
      id: tableItem.name,
      position: {
        x: column * gridGapX,
        y: row * gridGapY,
      },
      type: "tableNode",
    };
  });
}

function createEdges(relationships: VisualizerRelationship[]): Edge[] {
  return relationships.map((relationship, index) => ({
    animated: true,
    id: `e${index}`,
    label: relationship.type,
    labelStyle: {
      fill: "var(--primary)",
      fontSize: 12,
    },
    source: relationship.from,
    style: {
      stroke: "var(--primary)",
      strokeDasharray: "5 5",
      strokeWidth: 1,
    },
    target: relationship.to,
    type: "smoothstep",
  }));
}

export function SchemaVisualizer(props: {
  onOpenTable?: (tableName: string) => void;
  relationships: VisualizerRelationship[];
  tables: VisualizerTable[];
}) {
  const { onOpenTable, relationships, tables } = props;
  const nodeIds = useMemo(() => new Set(tables.map((tableItem) => tableItem.name)), [tables]);

  const validRelationships = useMemo(() => {
    return relationships.filter((relationship) => {
      return nodeIds.has(relationship.from) && nodeIds.has(relationship.to);
    });
  }, [nodeIds, relationships]);

  const initialNodes = useMemo(
    () => getLayoutedNodes({ onOpenTable, tables }),
    [onOpenTable, tables],
  );
  const initialEdges = useMemo(() => createEdges(validRelationships), [validRelationships]);

  const [nodes, setNodes] = useState<Node<TableNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    setNodes(getLayoutedNodes({ onOpenTable, tables }));
  }, [onOpenTable, tables]);

  useEffect(() => {
    setEdges(createEdges(validRelationships));
  }, [validRelationships]);

  const onConnect = useCallback(
    (connection: Connection | Edge) =>
      setEdges((currentEdges) => addEdge(connection, currentEdges)),
    [],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((currentNodes) => applyNodeChanges(changes, currentNodes)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges)),
    [],
  );

  return (
    <div className="h-full w-full bg-card">
      <ReactFlow
        connectionLineType={ConnectionLineType.SmoothStep}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodeTypes={nodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <Background className="bg-muted" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap pannable className="bg-muted/70 backdrop-blur-sm" />
      </ReactFlow>
    </div>
  );
}
