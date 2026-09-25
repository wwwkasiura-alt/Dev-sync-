import JSZip from 'jszip';
import { Project } from '../types';

export async function exportProjectAsZip(project: Project): Promise<void> {
  const zip = new JSZip();

  // Root folder
  const rootFolder = zip.folder(project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')) || zip;

  project.files.forEach((file) => {
    // Split path into subfolders if any
    rootFolder.file(file.path, file.content);
  });

  // If Android project, ensure gradlew and properties exist
  if (project.type === 'android-apk') {
    if (!project.files.some((f) => f.path.includes('gradle.properties'))) {
      rootFolder.file(
        'gradle.properties',
        'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.enableJetifier=true\nkotlin.code.style=official\n'
      );
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-source.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
