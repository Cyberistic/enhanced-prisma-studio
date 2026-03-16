import { Link, createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { default: prisma } = await import("@enhanced-prisma-studio/db");
    return prisma.user.findFirst({
      include: { todos: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
  },
  component: HomeComponent,
});

function HomeComponent() {
  const user = Route.useLoaderData();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{user?.name ?? "No users yet"}</CardTitle>
              <Badge variant="secondary">{user?.email}</Badge>
            </div>
            <CardDescription>
              {user?.todos.length ?? 0} recent todos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {user?.todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-3 py-2">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      todo.completed ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      todo.completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {todo.title}
                  </span>
                  {todo.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Link to="/studio" className={buttonVariants()}>
              Open Studio
            </Link>
            <Button variant="outline">View Schema</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
