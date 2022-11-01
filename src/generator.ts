import JSZip from 'jszip';
import { resizeImageBlob, saveAs } from './utils';
import type { songData } from './config';
import README from './assets/readme.txt';

export const generatePack = async (data: songData[], version : number, icon : string, name : string, mono : boolean) => {
	const rp = new JSZip();

	const packmcmeta = `
        {"pack": {"pack_format": ${version},"description": "Adds custom musics discs"}}
    `;

	rp.file('pack.mcmeta', packmcmeta);

	const packIcon = icon;
	const packpng = await (await (await fetch(packIcon)).blob()).arrayBuffer();

	rp.file('pack.png', packpng);

	const minecraft = rp.folder('assets')!.folder('minecraft')!;

	const soundsjson : {
        [key: string]: {
            sounds: {
                name: string,
                stream: boolean
            }[]
        }
    } = {};

	data.forEach(disc => {
		soundsjson[`music_disc.${disc.namespace}`] = {
			sounds: [
				{
					name: `records/${disc.namespace}`,
					stream: true,
				},
			],
		};
	});

	minecraft.file('sounds.json', JSON.stringify(soundsjson, null, 2));

	const models = minecraft.folder('models')!.folder('item')!;
	const sounds = minecraft.folder('sounds')!.folder('records')!;
	const textures = minecraft.folder('textures')!.folder('item')!;

	const m11 = {
		parent: 'item/generated',
		textures: {
			layer0: 'item/music_disc_11',
		},
		overrides: data.map((disc, i) => {
			return {
				predicate: {
					custom_model_data: i,
				},
				model: `item/music_disc_${disc.namespace}`,
			};
		}),
	};

	models.file('music_disc_11.json', JSON.stringify(m11, null, 2));

	for(let i = 0; i < data.length; i++) {
		const disc = data[i];

		const resizedTexture = await (await resizeImageBlob(disc.texture, 16, 16)).arrayBuffer();
		textures.file(`music_disc_${disc.namespace}.png`, resizedTexture);

		const soundbuffer = mono ? await disc.monoFile.arrayBuffer() : await disc.oggFile.arrayBuffer();
		sounds.file(`${disc.namespace}.ogg`, soundbuffer);

		console.log(disc);
		models.file(`music_disc_${disc.namespace}.json`, JSON.stringify({
			parent: 'item/generated',
			textures: {
				layer0: `item/music_disc_${disc.namespace}`,
			},
		}, null, 2));
	}

	rp.generateAsync({ type: 'blob' }).then(async content => {
		const zip = new JSZip();

		const discjson = data.map((disc, i) => {
			return {
				title: disc.name,
				author: disc.author,
				'disc-namespace': `music_disc.${disc.namespace}`,
				'model-data': i,
				'creeper-drop': disc.creeperDrop,
				lores: disc.lores.split('\n'),
				'loot-tables': disc.lootTables.join(',').split(','),
			};
		});


		zip.file('README.md', await (await fetch(README)).arrayBuffer());
		zip.file(`${name}.zip`, await content.arrayBuffer());
		zip.file('discs.json', JSON.stringify(discjson, null, 2));

		zip.generateAsync({ type: 'blob' }).then(async resources => {
			saveAs(resources, 'open me.zip');
		});
	});
};