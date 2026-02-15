"use client"

import { useState } from "react"
import { Plus, Trash2, Circle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
// import type { Todo } from "@/hooks/use-todo"
import type { Todo } from "@/lib/types" // Use lib/types instead

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useProjects } from "@/hooks/use-projects"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TodoViewProps {
    todos: Todo[]
    addTodo: (title: string, projectId?: string) => void
    toggleTodo: (id: string) => void
    deleteTodo: (id: string) => void
    error?: string | null
    t: any
}

export function TodoView({ todos, addTodo, toggleTodo, deleteTodo, error, t }: TodoViewProps) {
    const [newTodo, setNewTodo] = useState("")
    const [selectedProjectId, setSelectedProjectId] = useState<string>("none")
    const [filter, setFilter] = useState<"active" | "completed" | "all">("active")
    const { projects } = useProjects()

    const handleAdd = () => {
        if (!newTodo.trim()) return
        addTodo(newTodo.trim(), selectedProjectId === "none" ? undefined : selectedProjectId)
        setNewTodo("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleAdd()
        }
    }

    const filteredTodos = todos.filter((todo) => {
        if (filter === "active") return !todo.completed
        if (filter === "completed") return todo.completed
        return true
    })

    const getProjectName = (projectId?: string) => {
        if (!projectId) return null
        return projects.find(p => p.id === projectId)?.name
    }

    return (
        <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{t.todo}</h2>
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setFilter("active")}
                        className={cn(
                            "px-3 py-1 text-sm rounded-md transition-all",
                            filter === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        未完了
                    </button>
                    <button
                        onClick={() => setFilter("completed")}
                        className={cn(
                            "px-3 py-1 text-sm rounded-md transition-all",
                            filter === "completed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        完了済み
                    </button>
                    <button
                        onClick={() => setFilter("all")}
                        className={cn(
                            "px-3 py-1 text-sm rounded-md transition-all",
                            filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        すべて
                    </button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                {/* Add New Todo */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder={t.addTask}
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1"
                        />
                        <Button onClick={handleAdd} size="icon">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="w-1/2">
                        <Select
                            value={selectedProjectId}
                            onValueChange={setSelectedProjectId}
                        >
                            <SelectTrigger className="h-8 text-xs bg-background/50">
                                <SelectValue placeholder={t.selectProject} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t.noProject}</SelectItem>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Todo List Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                    <div className="col-span-8">タスク名</div>
                    <div className="col-span-3">プロジェクト</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Todo List */}
                <div className="space-y-1">
                    {filteredTodos.length === 0 ? (
                        <Card className="bg-card border-border">
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    {filter === "active" && "未完了のタスクはありません"}
                                    {filter === "completed" && "完了済みのタスクはありません"}
                                    {filter === "all" && t.noTasks}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredTodos.map((todo) => (
                            <div
                                key={todo.id}
                                className={cn(
                                    "group flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-center p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-colors",
                                    todo.completed && "opacity-60"
                                )}
                            >
                                {/* Task Name Column */}
                                <div className="col-span-8 flex items-center gap-3 w-full">
                                    <button
                                        onClick={() => toggleTodo(todo.id)}
                                        className={cn(
                                            "text-muted-foreground hover:text-primary transition-colors",
                                            todo.completed && "text-primary"
                                        )}
                                    >
                                        {todo.completed ? (
                                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        ) : (
                                            <Circle className="w-5 h-5 shrink-0" />
                                        )}
                                    </button>
                                    <span className={cn(
                                        "text-sm text-foreground truncate",
                                        todo.completed && "line-through text-muted-foreground"
                                    )}>
                                        {todo.title}
                                    </span>
                                </div>

                                {/* Project Column */}
                                <div className="col-span-3 text-xs text-muted-foreground truncate">
                                    {todo.projectId && (
                                        <span className="bg-muted px-2 py-1 rounded inline-flex items-center gap-1">
                                            <span
                                                className="w-2 h-2 rounded-full inline-block"
                                                style={{ backgroundColor: projects.find(p => p.id === todo.projectId)?.color || 'transparent' }}
                                            />
                                            {getProjectName(todo.projectId)}
                                        </span>
                                    )}
                                </div>

                                {/* Actions Column */}
                                <div className="col-span-1 flex justify-end w-full">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteTodo(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all h-8 w-8"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

