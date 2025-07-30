<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Matter from 'matter-js';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const MAX_CHARACTER_RENDERED = 100;
	let characters: Matter.Body[] = [];

	let lastKeyPressTime: number = 0;
	let lastStartX: number | null = null;
	const CONTINUOUS_INPUT_THRESHOLD = 500; // milliseconds

	let engine: Matter.Engine;
	let runner: Matter.Runner;
	let world: Matter.World;

	let topWall: Matter.Body, bottomWall: Matter.Body, leftWall: Matter.Body, rightWall: Matter.Body;
	let ctaTextBody: Matter.Body;
	let matterContainer: HTMLCanvasElement | null;

	let animationFrameId: number;

	const getContainerDimensions = (element: HTMLElement) => {
		return {
			width: element.clientWidth,
			height: element.clientHeight
		};
	};

	const handleGlobalKeyPress = (e: KeyboardEvent) => {
		// Prevent adding characters like 'Shift', 'Control', 'Alt', etc.
		if (e.key.length > 1 || e.key === ' ') {
			return;
		}

		if (!matterContainer) {
			console.warn('Canvas not initialized yet.');
			return;
		}

		const currentWidth = matterContainer.clientWidth;

		const currentTime = performance.now();
		const spawnPadding = 50;

		let startX: number;
		const moveIncrement = 30; // How much to add to the last position

		// Check if input is continuous
		if (
			lastKeyPressTime &&
			currentTime - lastKeyPressTime < CONTINUOUS_INPUT_THRESHOLD &&
			lastStartX !== null
		) {
			startX = lastStartX + moveIncrement;

			// Ensure it doesn't go off the right edge, if it does, randomize again
			if (startX > currentWidth - spawnPadding) {
				startX = Matter.Common.random(spawnPadding, currentWidth - spawnPadding);
			}
		} else {
			startX = Matter.Common.random(spawnPadding, currentWidth - spawnPadding);
		}

		lastKeyPressTime = currentTime;
		lastStartX = startX;
		const startY = 0;

		const size = 20;
		const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'];
		const charBody = Matter.Bodies.circle(startX, startY, size, {
			restitution: 0.7, // Make it a bit bouncy
			friction: 0.5,
			density: 0.001,
			render: {
				strokeStyle: '#2C3E50',
				lineWidth: 2,
				text: {
					size,
					color: colors[Math.floor(Math.random() * colors.length)],
					content: e.key,
					family: 'Cherry Bomb One'
				}
			}
		});

		characters.push(charBody);
		if (characters.length > MAX_CHARACTER_RENDERED) {
			const bodyToRemove = characters.shift(); // Remove the oldest body from the array
			if (bodyToRemove) {
				Matter.Composite.remove(world, bodyToRemove);
			}
		}

		Matter.Composite.add(world, charBody);
	};

	// Define handleResize outside onMount to make it accessible by onDestroy
	const handleResize = () => {
		if (!matterContainer) return;

		const { width: newWidth, height: newHeight } = getContainerDimensions(matterContainer);

		matterContainer.width = newWidth;
		matterContainer.height = newHeight;

		// Reposition walls
		// Only remove and re-add if walls exist
		if (topWall && bottomWall && leftWall && rightWall) {
			Matter.Composite.remove(world, [topWall, bottomWall, leftWall, rightWall]);
		}

		const offset = 26; // Thickness of the walls
		const wallOptions = {
			isStatic: true,
			render: { fillStyle: '#607D8B' }
		};

		topWall = Matter.Bodies.rectangle(
			newWidth / 2,
			-offset,
			newWidth + 2 * offset,
			50.5,
			wallOptions
		);
		bottomWall = Matter.Bodies.rectangle(
			newWidth / 2,
			newHeight + offset,
			newWidth + 2 * offset,
			50.5,
			wallOptions
		);
		rightWall = Matter.Bodies.rectangle(
			newWidth + offset,
			newHeight / 2,
			50.5,
			newHeight + 2 * offset,
			wallOptions
		);
		leftWall = Matter.Bodies.rectangle(
			-offset,
			newHeight / 2,
			50.5,
			newHeight + 2 * offset,
			wallOptions
		);

		Matter.Composite.add(world, [topWall, bottomWall, leftWall, rightWall]);

		// Recreate and add CTA body
		const ctaElement = document.getElementById('cta-text') as HTMLElement;
		if (ctaElement) {
			if (ctaTextBody) {
				// Remove old CTA body
				Matter.Composite.remove(world, ctaTextBody);
			}
			const rect = ctaElement.getBoundingClientRect();
			const canvasRect = matterContainer.getBoundingClientRect();

			const ctaX = rect.left + rect.width / 2 - canvasRect.left;
			const ctaY = rect.top + rect.height / 2 - canvasRect.top;

			ctaTextBody = Matter.Bodies.rectangle(ctaX, ctaY, rect.width, rect.height - 10, {
				isStatic: true,
				label: 'cta-text',
				render: {
					fillStyle: 'none'
				}
			});
			Matter.Composite.add(world, ctaTextBody);
		}
	};

	onMount(() => {
		if (!browser) {
			return;
		}

		matterContainer = document.getElementById('matter-container') as HTMLCanvasElement;
		const ctaElement = document.getElementById('cta-text') as HTMLElement;

		if (!matterContainer) {
			console.error('Matter.js container element not found in the DOM.');
			return;
		}
		if (!ctaElement) {
			console.error('CTA text element not found in the DOM. Ensure it has id="cta-text".');
			return;
		}

		const { Engine, Runner, MouseConstraint, Mouse, Composite } = Matter;

		engine = Engine.create();
		world = engine.world;
		engine.gravity.y = 5;

		requestAnimationFrame(() => {
			if (!matterContainer) return;

			handleResize();

			const customRenderLoop = () => {
				if (!matterContainer) {
					cancelAnimationFrame(animationFrameId); // Stop if container is gone
					return;
				}
				var bodies = Matter.Composite.allBodies(engine.world);
				var context = matterContainer.getContext('2d');

				if (!context) return;

				// Clear the canvas
				context.fillStyle = '#FFFFFF';
				context.fillRect(0, 0, matterContainer.width, matterContainer.height);
				context.globalAlpha = 1;
				context.beginPath();

				for (var i = 0; i < bodies.length; i += 1) {
					var part = bodies[i];

					// Draw body outlines (optional, for debugging)
					// if (part.vertices) {
					// 	context.moveTo(part.vertices[0].x, part.vertices[0].y);
					// 	for (var j = 1; j < part.vertices.length; j += 1) {
					// 		context.lineTo(part.vertices[j].x, part.vertices[j].y);
					// 	}
					// 	context.lineTo(part.vertices[0].x, part.vertices[0].y);
					// }

					if (part.render && (part.render as any).text) {
						var fontsize = (part.render as any).text.size || 30;
						var fontfamily = (part.render as any).text.family || 'Arial';
						var color = (part.render as any).text.color || '#FF0000';

						if ((part as any).circleRadius) {
							fontsize = (part as any).circleRadius * 2.4;
						}

						var content = '';
						if (typeof (part.render as any).text === 'string') {
							content = (part.render as any).text;
						} else if ((part.render as any).text.content) {
							content = (part.render as any).text.content;
						}

						context.save();
						context.translate(part.position.x, part.position.y);
						// Use the body's angle for rotation
						context.rotate(part.angle);

						context.textBaseline = 'middle';
						context.textAlign = 'center';
						context.fillStyle = color; // Use the color from render.text
						context.font = fontsize + 'px ' + fontfamily;
						context.fillText(content, 0, 0);
						context.restore();
					}
				}

				// If you want to draw outlines for the bodies, uncomment this:
				context.lineWidth = 1.5;
				context.strokeStyle = '#000000';
				context.stroke();

				animationFrameId = window.requestAnimationFrame(customRenderLoop);
			};

			// Start the custom render loop
			customRenderLoop();

			runner = Runner.create();
			Runner.run(runner, engine);

			// Add mouse control
			const mouse = Mouse.create(matterContainer);
			const mouseConstraint = MouseConstraint.create(engine, {
				mouse: mouse,
				constraint: {
					stiffness: 0.2,
					render: {
						visible: false
					}
				}
			});
			Composite.add(world, mouseConstraint);
		});

		window.addEventListener('resize', handleResize);
		window.addEventListener('keydown', handleGlobalKeyPress);

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('keydown', handleGlobalKeyPress);

			// Stop the custom animation frame loop
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}

			// Clean up Matter.js
			if (runner) Runner.stop(runner);
			if (engine) Engine.clear(engine);
			if (world) Composite.clear(world, false);
		};
	});
</script>

<div class="relative flex h-screen items-center justify-center overflow-hidden">
	<canvas id="matter-container" class="relative z-[1] h-full w-full"></canvas>

	<div
		class="pointer-events-none absolute z-[2] flex h-full w-full items-center justify-center text-4xl"
	>
		<p id="cta-text" class="text-gray-800">{$_('page.cta')}</p>
		<span class="ellipsis mt-6"> </span>
	</div>
</div>

<style>
	html,
	body,
	#svelte {
		height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	.ellipsis {
		width: 30px;
		aspect-ratio: 2;
		--_g: no-repeat radial-gradient(circle closest-side, #1e2939 90%, #1e293900);
		background:
			var(--_g) 0% 50%,
			var(--_g) 50% 50%,
			var(--_g) 100% 50%;
		background-size: calc(100% / 3) 50%;
		animation: l3 1s infinite linear;
	}
	@keyframes l3 {
		20% {
			background-position:
				0% 0%,
				50% 50%,
				100% 50%;
		}
		40% {
			background-position:
				0% 100%,
				50% 0%,
				100% 50%;
		}
		60% {
			background-position:
				0% 50%,
				50% 100%,
				100% 0%;
		}
		80% {
			background-position:
				0% 50%,
				50% 50%,
				100% 100%;
		}
	}
</style>
