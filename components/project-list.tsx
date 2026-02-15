"use client"

import { useState } from "react"
import { useProjects } from "@/hooks/use-projects"
import { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react"
import { ProjectDialog } from "./project-dialog"

interface ProjectListProps {
    defaultHourlyRate: number
    t: Record<string, string>
}

export function ProjectList({ defaultHourlyRate, t }: ProjectListProps) {
    const { projects, addProject, updateProject, deleteProject } = useProjects()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)

    const handleAdd = () => {
        setEditingProject(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (project: Project) => {
        setEditingProject(project)
        setIsDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        if (confirm(t.deleteSelected ? t.deleteSelected + "?" : "Are you sure?")) {
            deleteProject(id)
        }
    }

    const handleSave = (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
        if (editingProject) {
            updateProject(editingProject.id, data)
        } else {
            addProject(data)
        }
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    {t.projects}
                </CardTitle>
                <Button size="sm" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t.addProject}
                </Button>
            </CardHeader>
            <CardContent>
                {projects.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        {t.noProject}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: project.color }}
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">{project.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {project.clientName ? `${project.clientName} • ` : ""}
                                            ¥{project.hourlyRate.toLocaleString()}/h
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleEdit(project)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(project.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <ProjectDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    project={editingProject}
                    onSave={handleSave}
                    defaultHourlyRate={defaultHourlyRate}
                    t={t}
                />
            </CardContent>
        </Card>
    )
}
