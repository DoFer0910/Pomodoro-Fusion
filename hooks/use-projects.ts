"use client"

import { useState, useEffect } from "react"
import { Project } from "@/lib/types"
import { getProjects, addProject, updateProject, deleteProject } from "@/lib/storage"

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([])
    const [mounted, setMounted] = useState(false)

    const refreshProjects = async () => {
        setProjects(await getProjects())
    }

    useEffect(() => {
        setMounted(true)
        refreshProjects()
    }, [])

    const add = async (projectData: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
        const now = Date.now()
        const newProject: Project = {
            ...projectData,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        await addProject(newProject)
        await refreshProjects()
        return newProject
    }

    const update = async (id: string, data: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>) => {
        const currentProjects = await getProjects()
        const projectBase = currentProjects.find(p => p.id === id)
        if (!projectBase) return

        const updatedProject: Project = {
            ...projectBase,
            ...data,
            updatedAt: Date.now(),
        }
        await updateProject(updatedProject)
        await refreshProjects()
    }

    const remove = async (id: string) => {
        await deleteProject(id)
        await refreshProjects()
    }

    return {
        projects,
        addProject: add,
        updateProject: update,
        deleteProject: remove,
        refreshProjects
    }
}
