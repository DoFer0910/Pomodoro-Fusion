"use client"

import { useState, useEffect } from "react"

export interface Todo {
    id: string
    title: string
    completed: boolean
    createdAt: number
}

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
                // Filter out any old data that might have notion specific fields if needed, 
                // but local storage just stores JSON, so extra fields will just be ignored by the new interface at runtime typescript-wise,
                // but to be clean we could map it. For now, just parsing is fine.
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

    const addTodo = (title: string) => {
        const newTodo: Todo = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            createdAt: Date.now(),
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
