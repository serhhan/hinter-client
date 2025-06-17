<script lang="ts">
	/**
	 * Avatar component for displaying user avatars using DiceBear API
	 * @param seed - Unique identifier (usually publicKey or username)
	 * @param alt - Alternative text for accessibility
	 * @param size - Avatar size preset
	 * @param style - DiceBear avatar style
	 */
	export let seed: string;
	export let alt: string;
	export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let style: 'miniavs' | 'notionists-neutral' | 'adventurer' | 'personas' =
		'notionists-neutral';

	const sizeClasses = {
		sm: 'h-10 w-10',
		md: 'h-12 w-12',
		lg: 'h-16 w-16',
		xl: 'h-24 w-24'
	};

	$: avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=ffcc00,00ccff&backgroundType=gradientLinear&backgroundRotation=0,360`;
</script>

<div class="{sizeClasses[size]} overflow-hidden rounded-full bg-gray-500">
	<img class="h-full w-full object-cover" src={avatarUrl} {alt} />
</div>
