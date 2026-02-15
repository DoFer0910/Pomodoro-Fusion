"use client"

import { useState, useEffect } from "react"

import { Todo } from "@/lib/types"
import { getStorage } from "@/lib/storage/adapter"

const TODOS_KEY = "pomodoro-todos"

export function useTodo() {
    const [todos, setTodos] = useState<Todo[]>([])
    const [mounted, setMounted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        const load = async () => {
            const storage = getStorage()
            const stored = await storage.get<Todo[]>(TODOS_KEY)
            if (stored) {
                setTodos(stored)
            }
        }
        load()
    }, [])

    useEffect(() => {
        if (mounted) {
            const save = async () => {
                const storage = getStorage()
                await storage.set(TODOS_KEY, todos)
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
