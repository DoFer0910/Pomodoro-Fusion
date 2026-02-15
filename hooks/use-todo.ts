"use client"

import { useState, useEffect } from "react"

import { Todo } from "@/lib/types"

const TODOS_KEY = "pomodoro-todos"

export function useTodo() {
    const [todos, setTodos] = useState<Todo[]>([])
    const [mounted, setMounted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        const stored = localStorage.getItem(TODOS_KEY)
        if (stored) {
            try {
                setTodos(JSON.parse(stored))
            } catch (e) {
                console.error("Failed to parse todos", e)
            }
        }
    }, [])

    useEffect(() => {
        if (mounted) {
            localStorage.setItem(TODOS_KEY, JSON.stringify(todos))
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
