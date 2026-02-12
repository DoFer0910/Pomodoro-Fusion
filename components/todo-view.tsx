"use client"

import { useState } from "react"
import { Plus, Trash2, Circle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Todo } from "@/hooks/use-todo"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface TodoViewProps {
    todos: Todo[]
    addTodo: (title: string) => void
    toggleTodo: (id: string) => void
    deleteTodo: (id: string) => void
    error?: string | null
    t: any
}

export function TodoView({ todos, addTodo, toggleTodo, deleteTodo, error, t }: TodoViewProps) {
    const [newTodo, setNewTodo] = useState("")

    const handleAdd = () => {
        if (!newTodo.trim()) return
        addTodo(newTodo.trim())
        setNewTodo("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleAdd()
        }
    }

    return (
        <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{t.todo}</h2>
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

                {/* Todo List Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                    <div className="col-span-11">タスク名</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Todo List */}
                <div className="space-y-1">
                    {todos.length === 0 ? (
                        <Card className="bg-card border-border">
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">{t.noTasks}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        todos.map((todo) => (
                            <div
                                key={todo.id}
                                className={cn(
                                    "group flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-center p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-colors",
                                    todo.completed && "opacity-60"
                                )}
                            >
                                {/* Task Name Column */}
                                <div className="col-span-11 flex items-center gap-3 w-full">
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
