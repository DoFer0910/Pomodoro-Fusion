"use client"

import { useState, useEffect } from "react"

import { Todo } from "@/lib/types"
import { getTodos, saveTodos } from "@/lib/storage"

export function useTodo() {
    const [todos, setTodos] = useState<Todo[]>([])
    const [mounted, setMounted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        const load = async () => {
            const stored = await getTodos()
            if (stored) {
                setTodos(stored)
            }
        }
        load()
    }, [])

    useEffect(() => {
        if (mounted) {
            const save = async () => {
                await saveTodos(todos)
            }
            save()
        }
    }, [todos, mounted])

    const addTodo = (title: string, projectId?: string) => {
        const newTodo: Todo = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            createdAt: Date.now(),
            projectId,
        }
        setTodos((prev) => [newTodo, ...prev])
    }

    const toggleTodo = (id: string) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
        )
    }

    const deleteTodo = (id: string) => {
        setTodos((prev) => prev.filter((t) => t.id !== id))
    }

    return {
        todos,
        addTodo,
        toggleTodo,
        deleteTodo,
        error
    }
}
