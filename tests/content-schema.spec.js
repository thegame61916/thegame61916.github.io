import { test, expect } from '@playwright/test';
import { site, publications, projects, collaborators, students, teaching, talks, news, timeline } from './fixtures.js';

test.describe('content data integrity', () => {
  test('site metadata has the fields required by the UI', () => {
    expect(site.name).toBeTruthy();
    expect(site.title).toBeTruthy();
    expect(site.affiliation).toBeTruthy();
    expect(site.photo).toMatch(/^\/assets\//);
    expect(site.emails.length).toBeGreaterThan(0);
    expect(site.researchInterests.length).toBeGreaterThan(0);
  });

  test('all publication, project and people cross references resolve', () => {
    const publicationIds = new Set(publications.map(item => item.id));
    const projectIds = new Set(projects.map(item => item.id));
    const collaboratorIds = new Set(collaborators.map(item => item.id));

    expect(publicationIds.size).toBe(publications.length);
    expect(projectIds.size).toBe(projects.length);
    expect(collaboratorIds.size).toBe(collaborators.length);

    for (const publication of publications) {
      expect(publication.title, `${publication.id} title`).toBeTruthy();
      expect(publication.authorText, `${publication.id} authorText`).toBeTruthy();
      expect(publication.venue, `${publication.id} venue`).toBeTruthy();
      expect(publication.year, `${publication.id} year`).toBeTruthy();
      expect(publication.thumbnail, `${publication.id} thumbnail`).toMatch(/^\/assets\//);
      expect(publication.thumbnail, `${publication.id} thumbnail`).toMatch(/\.png$/);
      expect(publication.abstract, `${publication.id} abstract`).toBeTruthy();
      expect(publication.filterKeywords?.length || 0, `${publication.id} filterKeywords`).toBeGreaterThan(0);
      for (const authorId of publication.authors || []) expect(collaboratorIds.has(authorId), `${publication.id} missing author ${authorId}`).toBe(true);
      for (const projectId of publication.projects || []) expect(projectIds.has(projectId), `${publication.id} missing project ${projectId}`).toBe(true);
    }

    for (const project of projects) {
      expect(project.title, `${project.id} title`).toBeTruthy();
      expect(project.short, `${project.id} short`).toBeTruthy();
      expect(project.image, `${project.id} image`).toMatch(/^\/assets\//);
      expect(project.image, `${project.id} image`).toMatch(/\.png$/);
      for (const publicationId of project.publications || []) expect(publicationIds.has(publicationId), `${project.id} missing publication ${publicationId}`).toBe(true);
      for (const collaboratorId of project.collaborators || []) expect(collaboratorIds.has(collaboratorId), `${project.id} missing collaborator ${collaboratorId}`).toBe(true);
    }
  });

  test('section data required by pages is present', () => {
    expect(students.length).toBeGreaterThan(0);
    expect(teaching.length).toBeGreaterThan(0);
    expect(talks.length).toBeGreaterThan(0);
    expect(news.length).toBeGreaterThan(0);
    expect(timeline.length).toBeGreaterThan(0);
    for (const item of news) expect(Number.isNaN(new Date(item.date).getTime()), `Invalid news date: ${item.date}`).toBe(false);
  });
});
