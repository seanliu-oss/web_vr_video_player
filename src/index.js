import * as THREE from '../node_modules/three/build/three.module.js';
import { VRButton } from '../node_modules/three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';

import WebGL from '../node_modules/three/examples/jsm/capabilities/WebGL.js';

import ThreeMeshUI from '../node_modules/three-mesh-ui/build/three-mesh-ui.module.js';
import VRControl from '../node_modules/three-mesh-ui/examples/utils/VRControl.js';

import { PlayerPanel } from './PlayerPanelUI.js';
import { FileBrowserPanel } from './FileBrowser/FileBrowserPanelUI.js';
import VideoEntry from './FileBrowser/VideoEntry.js';
import FolderEntry from './FileBrowser/FolderEntry.js';
import * as ScreenManager from './ScreenManager/ScreenManager.js';
import * as UI from './UI.js';

export let scene, camera, cameras, renderer, orbitControls, vrControl, vrControlCurrentlyUsedController, gamepad, video, video_src, videoTexture, meshLeftSBS, meshLeftTB, meshRightSBS, meshRightTB, mesh2dSBS, mesh2dTB, meshForScreenMode, meshes, meshLeft360, meshRight360, mesh2d360;
export let clickedButton = undefined;
export let playMenuPanel;
export let fileBrowserPanel;
export let camToSave = {};
export const objectsToDrag = {};

let popupMessage, popupContainer;
import FontJSON from '../assets/fonts/Roboto-Regular-msdf.json';
import FontImage from '../assets/fonts/Roboto-Regular.png';

const verifyVideoSRC = true;

export let hiddenSphere;
const CAMERAPOSITIONY = 1.6;

// compute mouse position in normalized device coordinates
// (-1 to +1) for both directions.
// Used to raycasting against the interactive elements

const raycaster = new THREE.Raycaster();
raycaster.layers.set(0);

const mouse = new THREE.Vector2();
mouse.x = mouse.y = null;

let selectState = false;

window.addEventListener('pointermove', (event) => {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('pointerdown', () => {
	selectState = true;
});

window.addEventListener('pointerup', () => {
	selectState = false;
	clickedButton = undefined;
});

window.addEventListener('touchstart', (event) => {
	selectState = true;
	mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('touchend', () => {
	selectState = false;
	clickedButton = undefined;
	mouse.x = null;
	mouse.y = null;
});

//

function init() {

	////////////////////////
	//  Basic Three Setup
	////////////////////////

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x101010);

	camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000);
	camera.layers.enable(1);
	camera.position.y = CAMERAPOSITIONY;
	scene.add(camera);
	ScreenManager.registerPanel('cameras', 'camera', 'camera');
	cameras = { camera: camera };

	renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
	renderer.localClippingEnabled = true;
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	document.body.appendChild(VRButton.createButton(renderer));
	document.body.appendChild(renderer.domElement);

	// Orbit controls for no-vr

	orbitControls = new OrbitControls(camera, renderer.domElement);
	orbitControls.target = new THREE.Vector3(0, 1, -1.8);

	/////////
	// Room
	/////////

	video = document.getElementById('video');

	videoTexture = new THREE.VideoTexture(video);
	const material = new THREE.MeshBasicMaterial({ map: videoTexture });

	// screen mode

	// const geometryScreen = new THREE.SphereGeometry(120, 60, 40, (Math.PI / 16 + Math.PI / 4 + Math.PI), (Math.PI / 4 + Math.PI / 8), (Math.PI / 4 + Math.PI / 8), Math.PI / 4);
	const geometryScreen = new THREE.PlaneGeometry(60, 60);
	// invert the geometry on the x-axis so that all of the faces point inward
	// geometryScreen.scale(- 1, 1, 1);

	meshForScreenMode = new THREE.Mesh(geometryScreen, material);
	meshForScreenMode.visible = false;
	scene.add(meshForScreenMode);
	meshForScreenMode.position.setZ(-75);
	meshForScreenMode.position.setY(CAMERAPOSITIONY);
	meshForScreenMode.scale.x = 1.5;

	/////// EYES
	const geometryLeftSBS = new THREE.SphereGeometry(120, 60, 40, Math.PI, Math.PI);
	// invert the geometry on the x-axis so that all of the faces point inward
	geometryLeftSBS.scale(- 1, 1, 1);
	const geometryLeftTB = new THREE.SphereGeometry(120, 60, 40, Math.PI / 2 + Math.PI / 4, Math.PI + Math.PI / 2);
	geometryLeftTB.scale(- 1, 1, 1);
	const geometryRightSBS = geometryLeftSBS.clone();
	const geometryRightTB = geometryLeftTB.clone();
	const geometryLeft360 = new THREE.SphereGeometry(240, 120, 80, Math.PI/2);
	geometryLeft360.scale(- 1, 1, 1);
	const geometryRight360 = geometryLeft360.clone();

	//// left eye
	// SBS
	const uvsLeftSBS = geometryLeftSBS.attributes.uv.array;
	for (let i = 0; i < uvsLeftSBS.length; i += 2) {

		uvsLeftSBS[i] *= 0.5;

	}

	meshLeftSBS = new THREE.Mesh(geometryLeftSBS, material);
	meshLeftSBS.layers.set(1); // display in left eye only
	meshLeftSBS.visible = false;
	meshLeftSBS.position.setZ(-120);
	scene.add(meshLeftSBS);

	// mesh for 2d mode

	mesh2dSBS = meshLeftSBS.clone();
	mesh2dSBS.layers.set(2);
	mesh2dSBS.visible = false;
	scene.add(mesh2dSBS);

	// TB
	const uvsLeftTB = geometryLeftTB.attributes.uv.array;
	for (let i = 1; i < uvsLeftTB.length; i += 2) {

		uvsLeftTB[i] *= 0.5;
		uvsLeftTB[i] += 0.5;

	}

	meshLeftTB = new THREE.Mesh(geometryLeftTB, material);
	meshLeftTB.layers.set(1); // display in left eye only
	meshLeftTB.visible = false;
	meshLeftTB.position.setZ(-120);
	scene.add(meshLeftTB);

	// mesh for 2d mode

	mesh2dTB = meshLeftTB.clone();
	mesh2dTB.layers.set(2);
	mesh2dTB.visible = false;
	scene.add(mesh2dTB);

	// 360
	const uvsLeft360 = geometryLeft360.attributes.uv.array;
	for (let i = 1; i < uvsLeft360.length; i += 2) {

		uvsLeft360[i] *= 0.5;
		uvsLeft360[i] += 0.5;

	}

	meshLeft360 = new THREE.Mesh(geometryLeft360, material);
	meshLeft360.layers.set(1); // display in left eye only
	meshLeft360.visible = false;
	meshLeft360.position.setZ(-120);
	scene.add(meshLeft360);

	// mesh for 2d mode

	mesh2d360 = meshLeft360.clone();
	mesh2d360.layers.set(2);
	mesh2d360.visible = false;
	scene.add(mesh2d360);

	//// right eye
	// SBS
	const uvsRightSBS = geometryRightSBS.attributes.uv.array;

	for (let i = 0; i < uvsRightSBS.length; i += 2) {

		uvsRightSBS[i] *= 0.5;
		uvsRightSBS[i] += 0.5;

	}
	meshRightSBS = new THREE.Mesh(geometryRightSBS, material);
	meshRightSBS.layers.set(2); // display in right eye only
	meshRightSBS.visible = false;
	meshRightSBS.position.setZ(-120);
	scene.add(meshRightSBS);

	// TB
	const uvsRightTB = geometryRightTB.attributes.uv.array;
	for (let i = 1; i < uvsRightTB.length; i += 2) {

		uvsRightTB[i] *= 0.5;

	}

	meshRightTB = new THREE.Mesh(geometryRightTB, material);
	meshRightTB.layers.set(2); // display in left eye only
	meshRightTB.visible = false;
	meshRightTB.position.setZ(-120);
	scene.add(meshRightTB);

	// 360

	const uvsRight360 = geometryRight360.attributes.uv.array;
	for (let i = 1; i < uvsRight360.length; i += 2) {

		uvsRight360[i] *= 0.5;

	}

	meshRight360 = new THREE.Mesh(geometryRight360, material);
	meshRight360.layers.set(2); // display in left eye only
	meshRight360.visible = false;
	meshRight360.position.setZ(-120);
	scene.add(meshRight360);

	ScreenManager.registerMeshPanel('meshLeftSBS', 'meshLeftSBS', '3d', 'sbs', 'left');
	ScreenManager.registerMeshPanel('meshLeftTB', 'meshLeftTB', '3d', 'tb', 'left');
	ScreenManager.registerMeshPanel('meshRightSBS', 'meshRightSBS', '3d', 'sbs', 'right');
	ScreenManager.registerMeshPanel('meshRightTB', 'meshRightTB', '3d', 'tb', 'right');
	ScreenManager.registerMeshPanel('mesh2dSBS', 'mesh2dSBS', '2d', 'sbs', 'right');
	ScreenManager.registerMeshPanel('mesh2dTB', 'mesh2dTB', '2d', 'tb', 'right');
	ScreenManager.registerMeshPanel('meshForScreenMode', 'meshForScreenMode', 'screen', 'screen', 'both');
	ScreenManager.registerMeshPanel('meshLeft360', 'meshLeft360', '3d', '360', 'left');
	ScreenManager.registerMeshPanel('meshRight360', 'meshRight360', '3d', '360', 'right');
	ScreenManager.registerMeshPanel('mesh2d360', 'mesh2d360', '2d', '360', 'right');
	// register for recenter
	registerObjectToDrag(meshLeftSBS, "player");
	registerObjectToDrag(meshLeftTB, "player");
	registerObjectToDrag(meshRightSBS, "player");
	registerObjectToDrag(meshRightTB, "player");
	registerObjectToDrag(mesh2dSBS, "player");
	registerObjectToDrag(mesh2dTB, "player");
	registerObjectToDrag(meshForScreenMode, "player");
	registerObjectToDrag(meshLeft360, "player");
	registerObjectToDrag(meshRight360, "player");
	registerObjectToDrag(mesh2d360, "player");
	meshes = {
		meshLeftSBS: meshLeftSBS,
		meshRightSBS: meshRightSBS,
		meshLeftTB: meshLeftTB, 
		meshRightTB: meshRightTB, 
		mesh2dSBS: mesh2dSBS, 
		mesh2dTB: mesh2dTB, 
		meshForScreenMode: meshForScreenMode,
		meshLeft360: meshLeft360,
		meshRight360: meshRight360,
		mesh2d360: mesh2d360,
	};

	//////////
	// Light
	//////////

	const color = 0xFFFFFF;
	const intensity = 1;
	const light = new THREE.DirectionalLight(color, intensity);
	light.position.set(-1, 2, 4);
	scene.add(light);

	////////////////
	// Controllers
	////////////////

	vrControl = VRControl(renderer);
	vrControlCurrentlyUsedController = 0;
	scene.add(vrControl.controllerGrips[0], vrControl.controllers[0]);
	scene.add(vrControl.controllerGrips[1], vrControl.controllers[1]);

	vrControl.controllers[0].addEventListener('selectstart', () => {

		vrControlSelected(0);

	});
	vrControl.controllers[0].addEventListener('selectend', () => {

		vrControlUnselected(0);

	});

	vrControl.controllers[1].addEventListener('selectstart', () => {

		vrControlSelected(1);

	});
	vrControl.controllers[1].addEventListener('selectend', () => {

		vrControlUnselected(1);

	});

	function vrControlSelected(id) {
		if (vrControlCurrentlyUsedController == id) {
			selectState = true;
		} else {
			vrControl.controllers[vrControlCurrentlyUsedController].point.visible = false;
			vrControlCurrentlyUsedController = id;
		}
	}

	function vrControlUnselected(id) {
		if (vrControlCurrentlyUsedController == id) {
			selectState = false;
			clickedButton = undefined;
		}
	}

	//////////
	// Panel
	//////////

	hiddenSphere = new UI.HiddenSphere();
	scene.add(hiddenSphere);
	UI.objsToTest.push(hiddenSphere);
	playMenuPanel = new PlayerPanel(video);

	////////////////////////////////////////
	popupContainer = new ThreeMeshUI.Block({
		justifyContent: 'center',
		contentDirection: 'row',
		fontFamily: FontJSON,
		fontTexture: FontImage,
		fontSize: 0.07,
		padding: 0.02,
		borderRadius: 0,
		backgroundOpacity: 1,
		backgroundColor: new THREE.Color(0x0099ff),
		height: 0.20,
		width: 2
	});
	popupMessage = new ThreeMeshUI.Text({
		content: '',
		fontFamily: FontJSON,
		fontTexture: FontImage,
		fontSize: 0.07,
		offset: 0.035,
		fontColor: new THREE.Color(0xffffff)
	});
	popupContainer.add(popupMessage);
	popupContainer.position.set(0, 1, -2);
	popupContainer.visible = false;
	scene.add(popupContainer);
	////////////////////////////////////////

	/////////////////////////////////////////////////////////////

	// save current camera position
	camToSave.position = camera.position.clone();
	camToSave.rotation = camera.rotation.clone();
	camToSave.controlCenter = orbitControls.target.clone();

	ScreenManager.savePositions("cameras");
	ScreenManager.savePositions("meshes");
	ScreenManager.savePositions("playMenuPanel");

	// register listeners on XR session start
	// change panels positions in VR
	// renderer.xr.addEventListener('sessionstart', ScreenManager.vrsessionstart);

	renderer.xr.addEventListener('sessionend', ScreenManager.vrsessionend);

	//

	if (document.getElementById('json_file')) {
		let json_file = document.getElementById('json_file').innerText;

		fetch(json_file)
			.then(response => response.json())
			.then(json => fileBrowserPanel = new FileBrowserPanel(json, verifyVideoSRC))
			.then(a => fileBrowserPanel.showFileMenuPanel())
			.then(a => ScreenManager.savePositions("fileBrowserPanel"))
			.catch((error) => {
				console.error('Error:', error);
				alert('Failed parsing json file, check console for details.');
			});
	} else if (document.getElementById('stashapp')) {
		let stashappURL = document.getElementById('stashapp').innerText;

		fetch(stashappURL + (stashappURL.substring(stashappURL.length - 1) == '/' ? '' : '/') + 'graphql', {
			method: "POST",
			cache: "no-cache",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ "query": "{ allScenes {title file_mod_time files {width height} paths { screenshot stream } studio { id name } tags { id name } } }" }),
		}).then(response => response.json())
			.then(jsonRaw => processStashAppData(jsonRaw))
			.then(json => fileBrowserPanel = new FileBrowserPanel(json))
			.then(a => fileBrowserPanel.showFileMenuPanel())
			.then(a => ScreenManager.savePositions("fileBrowserPanel"))
			.catch((error) => {
				console.error('Error:', error);
				alert('Failed parsing json file, check console for details.');
			});;
	} else {
		showPopupMessage("No video sources defined.");
	}

	//

	setTimeout(setLoop, 500);
}

function processStashAppData(json) {
	let preparedJson = { "videos": [] };
	let folders = [];
	json.data.allScenes.forEach((scene) => {
		if (scene.tags.filter(obj => { if (obj.name === 'VR' || obj.name === 'SBS' || obj.name === 'TB' || obj.name === 'SCREEN') { return true; } else { return false } })) {
			let screen_type = "sbs";
			scene.tags.forEach((tag) => {
				switch (tag.name) {
					case "SBS":
						screen_type = 'sbs';
						break;
					case "TB":
						screen_type = 'tb';
						break;
					case "SCREEN":
						screen_type = 'screen';
						break;
				}
			});
			let epoch = Date.parse(scene.file_mod_time);
			if (preparedJson.videos[folders[scene.studio.name] - 1]) {
				preparedJson.videos[folders[scene.studio.name] - 1].list.push(new VideoEntry(scene.title, scene.paths.stream, scene.paths.screenshot, screen_type, scene.files[0].height, scene.files[0].width, scene.file_mod_time, epoch));
			} else {
				folders.push(scene.studio.name);
				folders[scene.studio.name] = preparedJson.videos.push(new FolderEntry(scene.studio.name));
				preparedJson.videos[folders[scene.studio.name] - 1].list.push(new VideoEntry(scene.title, scene.paths.stream, scene.paths.screenshot, screen_type, scene.files[0].height, scene.files[0].width, scene.file_mod_time, epoch));
			}
		}
	});
	return preparedJson;
}

function setLoop() {
	renderer.setAnimationLoop(loop);
}

export function getCurrentZoom() {
	return meshLeftSBS.position.z;
}

let showPopupTimeoutID;

export function showPopupMessage(message) {
	if (typeof message === "string") {
		popupMessage.set({ content: message });
		popupContainer.visible = true;
		clearTimeout(showPopupTimeoutID);
		showPopupTimeoutID = setTimeout(() => {
			popupContainer.visible = false;
		}, 4000);
	} else {
		console.warn("Error in showPopupMessage, message must be string");
	}
}

function showMeshes3D() {
	meshLeftSBS.visible = true;
	meshRightSBS.visible = true;
}

function hideMeshes() {
	for (let mesh in meshes) {
		meshes[mesh].visible = false;
	};
}

// Handle resizing the viewport

function onWindowResize() {
	if (camera !== undefined && renderer !== undefined) {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
}

//

let gamepadAxisActive = false;
export let playbackIsActive = false;

export function playbackChange(is_active = false, screen_type = null) {
	switch (is_active) {
		case true:
			playbackIsActive = true;
			showMeshes3D();
			if (screen_type !== null) {
				ScreenManager.switchModeVRScreen(screen_type);
			}
			playMenuPanel.buttonPlay.playbackStarted();
			switch (ScreenManager.VRMode) {
				case 'tb':
					playMenuPanel.VRSBSTBModeButtonText.set({ content: 'TB'});
					break;
				case '360':
					playMenuPanel.VRSBSTBModeButtonText.set({ content: '360'});
					break;
				default:
				case 'sbs':
					playMenuPanel.VRSBSTBModeButtonText.set({ content: 'SBS'});
					break;
			}
			
			break;
		default:
		case false:
			playbackIsActive = false;
			hideMeshes();
			break;
	}
}

function gamepadControlsUpdate() {
	if (renderer.xr.isPresenting) {
		if (renderer.xr.getSession() !== null) {
			if (typeof renderer.xr.getSession().inputSources !== 'undefined' && renderer.xr.getSession().inputSources.length >= 1) {
				if (renderer.xr.getSession().inputSources.length >= 1) {
					gamepad = renderer.xr.getSession().inputSources[vrControlCurrentlyUsedController].gamepad;
					if (typeof gamepad !== 'undefined' && gamepad !== null) {
						if (gamepad.mapping === "xr-standard") {
							if (gamepad.axes[2] > 0.35 && gamepadAxisActive === false) {
								if (playbackIsActive) {
									playMenuPanel.videoPlaybackFFRew("FF", 10);
								} else {
									fileBrowserPanel.NextPage();
								}
								gamepadAxisActive = true;
							} else if (gamepad.axes[2] < -0.35 && gamepadAxisActive === false) {
								if (playbackIsActive) {
									playMenuPanel.videoPlaybackFFRew("Rew", 10);
								} else {
									fileBrowserPanel.PreviousPage();
								}
								gamepadAxisActive = true;
							} else if (gamepad.axes[3] > 0.35 && (gamepadAxisActive === false || gamepadAxisActive === "down")) {
								if (playbackIsActive) {
									ScreenManager.zoom("out", 0.5);
								}
								gamepadAxisActive = "down";
							} else if (gamepad.axes[3] < -0.35 && (gamepadAxisActive === false || gamepadAxisActive === "up")) {
								if (playbackIsActive) {
									ScreenManager.zoom("in", 0.5);
								}
								gamepadAxisActive = "up";
							} else if (gamepad.axes[2] < 0.35 && gamepad.axes[2] > -0.35) {
								gamepadAxisActive = false;
								gamepadButtonsCheck(gamepad.buttons);
							}
						}
					}
				}
			}
		}
	}
}

let buttonABXYpressed = false;

function gamepadButtonsCheck(buttons) {
	if (buttons[4].pressed && playbackIsActive && buttonABXYpressed === false) {
		playMenuPanel.playPause();
		buttonABXYpressed = true;
	} else if (buttons[5].pressed && playbackIsActive && buttonABXYpressed === false) {
		playMenuPanel.ExitToMain();
		buttonABXYpressed = true;
	} else if (!buttons[4].pressed && !buttons[5].pressed) {
		buttonABXYpressed = false;
	}
}

function loop() {

	renderer.render(scene, camera);

	ThreeMeshUI.update();

	orbitControls.update();

	gamepadControlsUpdate();

	updateButtons();

	playMenuPanel.progressBarAndDuration();

	// Execute Thumbnails Loader
	if (fileBrowserPanel !== undefined) {
		fileBrowserPanel.loadingAnimation();
		fileBrowserPanel.generateThumbnails();
	}
}

// Called in the loop, get intersection with either the mouse or the VR controllers,
// then update the buttons states according to result

function updateButtons() {

	// Find closest intersecting object

	let intersect;

	if (renderer.xr.isPresenting) {

		vrControl.setFromController(vrControlCurrentlyUsedController, raycaster.ray);

		intersect = raycast();

		// Position the little white dot at the end of the controller pointing ray
		// need to skip this if intersecting hiddenSphere because in VR it spreads points apart 
		if (intersect && intersect.object.name != hiddenSphere.name) {
			vrControl.setPointerAt(vrControlCurrentlyUsedController, intersect.point);
		};

	} else if (mouse.x !== null && mouse.y !== null) {

		raycaster.setFromCamera(mouse, camera);

		intersect = raycast();

	}

	// Update targeted button state (if any)

	if (intersect && intersect.object.isUI) {

		intersect.object.uv = { x: intersect.uv.x, y: intersect.uv.y };

		if (selectState) {
			if (clickedButton === undefined || clickedButton == intersect.object.uuid) {
				// Component.setState internally call component.set with the options you defined in component.setupState
				clickedButton = intersect.object.uuid;
				intersect.object.setState('selected');
			}
		} else {
			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState('hovered');
		}

	}

	// Update non-targeted buttons state

	UI.objsToTest.forEach((obj) => {

		if ((obj instanceof ThreeMeshUI.Block) && ((!intersect || obj !== intersect.object) && obj.isUI)) {
			// Component.setState internally call component.set with the options you defined in component.setupState
			if (obj.muted) {
				obj.setState('idlemuted');
			} else {
				obj.setState('idle');
			}

		}

	});

}

//

function raycast() {

	return UI.objsToTest.reduce((closestIntersection, obj) => {

		// Keyboard
		if (obj.type === 'Key' && fileBrowserPanel !== undefined && !fileBrowserPanel.keyboard.getObjectById(obj.id)) {

			return closestIntersection;

		}

		const intersection = raycaster.intersectObject(obj, true);

		if (!intersection[0]) return closestIntersection;

		if (!closestIntersection || intersection[0].distance < closestIntersection.distance) {

			intersection[0].object = obj;

			return intersection[0];

		}

		return closestIntersection;

	}, null);

}

export function registerObjectToDrag(obj, view) {
	if (!(view in objectsToDrag)) {
		objectsToDrag[view] = [];
	}
	objectsToDrag[view].push(obj);
}

export function scaleScreenMesh(x_scale) {
	meshForScreenMode.scale.x = x_scale;
}

if (WebGL.isWebGLAvailable()) {
	window.addEventListener('resize', onWindowResize);
	window.addEventListener("load", () => {
		init();
	});
} else {
	const warning = WebGL.getWebGLErrorMessage();
	document.body.appendChild(warning);
}