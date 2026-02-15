"use client"

import { useState, useEffect } from "react"
import { Project } from "@/lib/types"
import { getProjects, addProject, updateProject, deleteProject } from "@/lib/storage"

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([])
    const [mounted, setMounted] = useState(false)

    const refreshProjects = () => {
        setProjects(getProjects())
    }

    useEffect(() => {
        setMounted(true)
        refreshProjects()
    }, [])

    const add = (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
        const now = Date.now()
        const newProject: Project = {
            ...projectData,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        addProject(newProject)
        refreshProjects()
        return newProject
    }

    const update = (id: string, data: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>) => {
        const currentProjects = getProjects()
        const projectBase = currentProjects.find(p => p.id === id)
        if (!projectBase) return

        const updatedProject: Project = {
            ...projectBase,
            ...data,
            updatedAt: Date.now(),
        }
        updateProject(updatedProject)
        refreshProjects()
    }

    const remove = (id: string) => {
        deleteProject(id)
        refreshProjects()
    }

    return {
        projects,
        addProject: add,
        updateProject: update,
        deleteProject: remove,
        refreshProjects
    }
}
