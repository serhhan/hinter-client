<script lang="ts">
	import { micromark } from 'micromark';
	export let markdownContent: string = '';
</script>

<div class="prose prose-sm max-w-none rounded border border-gray-200 bg-white p-4">
	<div
		class="
      [&>*]:mb-4
      [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:text-gray-700 [&>blockquote]:italic [&>code]:rounded
      [&>code]:bg-gray-50 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:font-mono
      [&>code]:text-sm [&>em]:italic [&>h1]:mb-6 [&>h1]:border-b
      [&>h1]:border-gray-200 [&>h1]:pb-2
      [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:mt-8
      [&>h2]:mb-4 [&>h2]:text-xl [&>h2]:font-semibold
      [&>h3]:mt-6
      [&>h3]:mb-3 [&>h3]:text-lg [&>h3]:font-medium [&>hr]:my-8 [&>hr]:border-t
      [&>hr]:border-gray-200 [&>li]:text-gray-700 [&>ol]:list-decimal
      [&>ol]:space-y-2 [&>ol]:pl-5 [&>p]:leading-relaxed [&>p]:text-gray-700
      [&>pre]:overflow-x-auto [&>pre]:rounded [&>pre]:bg-gray-50 [&>pre]:p-4 [&>strong]:font-semibold [&>table]:my-6
      [&>table]:w-full
      [&>table]:border-collapse
      [&>table>tbody>tr]:hover:bg-gray-50 [&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-gray-300
      [&>table>tbody>tr>td]:p-2 [&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-gray-300 [&>table>thead>tr>th]:bg-gray-50 [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:text-left
      [&>table>thead>tr>th]:font-semibold [&>ul]:list-disc [&>ul]:space-y-2
      [&>ul]:pl-5
    "
	>
		{@html micromark(markdownContent)}
	</div>
</div>
