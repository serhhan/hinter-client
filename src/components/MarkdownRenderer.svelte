<script lang="ts">
    import { micromark } from 'micromark';
    export let markdownContent: string = '';
  </script>
  
  <div class="prose prose-sm max-w-none bg-white p-4 rounded border border-gray-200">
    <div class="
      [&>*]:mb-4
      [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:border-b [&>h1]:border-gray-200 [&>h1]:pb-2 [&>h1]:mb-6
      [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-8 [&>h2]:mb-4
      [&>h3]:text-lg [&>h3]:font-medium [&>h3]:mt-6 [&>h3]:mb-3
      [&>p]:leading-relaxed [&>p]:text-gray-700
      [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2
      [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2
      [&>li]:text-gray-700
      [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-700
      [&>hr]:my-8 [&>hr]:border-t [&>hr]:border-gray-200
      [&>pre]:bg-gray-50 [&>pre]:p-4 [&>pre]:rounded [&>pre]:overflow-x-auto
      [&>code]:bg-gray-50 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:font-mono
      [&>strong]:font-semibold
      [&>em]:italic
      [&>table]:w-full [&>table]:border-collapse [&>table]:my-6
      [&>table>thead>tr>th]:bg-gray-50 [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-gray-300 [&>table>thead>tr>th]:text-left [&>table>thead>tr>th]:font-semibold
      [&>table>tbody>tr>td]:p-2 [&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-gray-300
      [&>table>tbody>tr]:hover:bg-gray-50
    ">
      {@html micromark(markdownContent)}
    </div>
  </div>